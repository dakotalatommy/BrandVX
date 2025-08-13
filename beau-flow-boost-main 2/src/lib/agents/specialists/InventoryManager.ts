import { supabase } from "@/integrations/supabase/client";
import type { BrandVXIntent, AgentResponse } from "../BrandVXAgent";

/**
 * Inventory Manager Specialist  
 * Handles stock levels, par levels, reorders, and product listing updates
 */
export class InventoryManager {
  
  async handleInventory(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    const { payload } = intent;
    const action = payload.action || 'check_levels';

    switch (action) {
      case 'check_levels':
        return await this.checkStockLevels(intent, context);
      case 'low_stock_alert':
        return await this.handleLowStockAlert(intent, context);
      case 'reorder':
        return await this.handleReorder(intent, context);
      case 'update_listings':
        return await this.updateProductListings(intent, context);
      case 'forecast':
        return await this.forecastUsage(intent, context);
      default:
        return {
          type: 'error',
          text: 'I need to know what inventory action you\'d like me to help with.',
          data: { unknown_action: action }
        };
    }
  }

  private async checkStockLevels(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    const { userId } = intent;
    
    // Get current inventory levels
    const { data: inventory } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('user_id', userId);

    if (!inventory || inventory.length === 0) {
      return {
        type: 'result',
        text: 'No inventory items found. Would you like me to help you set up inventory tracking?',
        data: { setup_required: true }
      };
    }

    // Check for low stock items
    const lowStockItems = inventory.filter(item => {
      const thresholds = item.thresholds as any;
      const threshold = thresholds?.low_stock || 5;
      return item.qty <= threshold;
    });

    const summary = {
      total_items: inventory.length,
      low_stock_count: lowStockItems.length,
      items_to_reorder: lowStockItems.map(item => ({
        name: item.name,
        current_qty: item.qty,
        recommended_order: this.calculateReorderQuantity(item)
      }))
    };

    if (lowStockItems.length > 0) {
      return {
        type: 'plan',
        text: `I found ${lowStockItems.length} items running low. Would you like me to create reorder suggestions?`,
        data: summary,
        nextActions: ['create_reorder_list', 'update_par_levels']
      };
    }

    return {
      type: 'result',
      text: 'Inventory levels look good! All items are above minimum thresholds.',
      data: summary,
      events: [{
        type: 'inventory_checked',
        payload: { total_items: inventory.length, low_stock: 0 },
        baseline_min: 4,
        auto_min: 0.5
      }]
    };
  }

  private async handleLowStockAlert(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    const { payload, userId } = intent;
    const { item_id, current_qty } = payload;

    const { data: item } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', item_id)
      .eq('user_id', userId)
      .single();

    if (!item) {
      return {
        type: 'error',
        text: 'I couldn\'t find that inventory item.',
        data: { item_not_found: true }
      };
    }

    const reorderQty = this.calculateReorderQuantity(item);
    const suggestedSuppliers = this.getSuggestedSuppliers(item);

    return {
      type: 'plan',
      text: `${item.name} is running low (${current_qty} remaining). I recommend ordering ${reorderQty} units.`,
      data: {
        item: item.name,
        current_qty,
        recommended_order: reorderQty,
        suppliers: suggestedSuppliers,
        estimated_cost: reorderQty * ((item.thresholds as any)?.unit_cost || 10)
      },
      nextActions: ['create_purchase_order', 'update_supplier_info'],
      events: [{
        type: 'low_stock_alert_processed',
        payload: { item_id, item_name: item.name, qty: current_qty },
        baseline_min: 2,
        auto_min: 0.3
      }]
    };
  }

  private async handleReorder(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    const { payload, userId } = intent;
    const { items } = payload; // Array of {item_id, quantity}

    const purchaseOrder = {
      date: new Date().toISOString(),
      items: [],
      total_cost: 0
    };

    for (const orderItem of items) {
      const { data: item } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', orderItem.item_id)
        .eq('user_id', userId)
        .single();

      if (item) {
        const itemTotal = orderItem.quantity * ((item.thresholds as any)?.unit_cost || 10);
        purchaseOrder.items.push({
          name: item.name,
          sku: item.sku,
          quantity: orderItem.quantity,
          unit_cost: (item.thresholds as any)?.unit_cost || 10,
          total: itemTotal
        });
        purchaseOrder.total_cost += itemTotal;
      }
    }

    return {
      type: 'result',
      text: `Purchase order created for ${purchaseOrder.items.length} items. Total cost: $${purchaseOrder.total_cost}`,
      data: {
        purchase_order: purchaseOrder,
        next_steps: [
          'Review and approve order',
          'Send to preferred supplier',
          'Track delivery'
        ]
      },
      events: [{
        type: 'purchase_order_created',
        payload: { 
          item_count: purchaseOrder.items.length, 
          total_cost: purchaseOrder.total_cost 
        },
        baseline_min: 15, // Manual PO creation time
        auto_min: 2      // Automated creation time
      }]
    };
  }

  private async updateProductListings(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    const { payload, userId } = intent;
    const { platform, items } = payload; // platform: 'shopify' | 'square'

    let updatedCount = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        // Update inventory quantity in external platform
        await this.updateExternalInventory(platform, item);
        
        // Update local inventory
        await supabase
          .from('inventory_items')
          .update({ qty: item.new_quantity })
          .eq('id', item.item_id)
          .eq('user_id', userId);

        updatedCount++;
      } catch (error) {
        errors.push(`Failed to update ${item.name}: ${error.message}`);
      }
    }

    return {
      type: 'result',
      text: `Updated ${updatedCount} items on ${platform}. ${errors.length > 0 ? `${errors.length} errors occurred.` : 'All updates successful!'}`,
      data: {
        platform,
        updated_count: updatedCount,
        errors
      },
      events: [{
        type: 'inventory_listings_updated',
        payload: { platform, updated_count: updatedCount },
        baseline_min: 4, // Manual inventory updates
        auto_min: 0.5   // Automated sync
      }]
    };
  }

  private async forecastUsage(intent: BrandVXIntent, context: any): Promise<AgentResponse> {
    const { userId } = intent;
    
    // Get usage history from appointments
    const { data: appointments } = await supabase
      .from('appointments')
      .select('*, contacts!inner(user_id)')
      .eq('contacts.user_id', userId)
      .gte('start_ts', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .eq('status', 'completed');

    const serviceCount = (appointments || []).reduce((acc, apt) => {
      acc[apt.service] = (acc[apt.service] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Generate usage forecast
    const forecast = Object.entries(serviceCount).map(([service, count]) => ({
      service,
      weekly_average: Math.round(count / 12), // 12 weeks in 90 days
      monthly_forecast: Math.round(count / 3), // 3 months
      recommended_stock: this.getRecommendedStockForService(service, count / 12)
    }));

    return {
      type: 'result',
      text: 'Based on your appointment history, here\'s your inventory forecast:',
      data: {
        forecast_period: '90 days historical data',
        usage_forecast: forecast,
        recommendations: [
          'Stock up on high-usage items before busy seasons',
          'Consider bulk discounts for frequent services',
          'Monitor trends for new service offerings'
        ]
      }
    };
  }

  private calculateReorderQuantity(item: any): number {
    const parLevel = item.thresholds?.par_level || 20;
    const currentQty = item.qty || 0;
    const minOrder = item.thresholds?.min_order || 10;
    
    const needed = Math.max(parLevel - currentQty, minOrder);
    return Math.ceil(needed / minOrder) * minOrder; // Round up to min order multiples
  }

  private getSuggestedSuppliers(item: any): string[] {
    // In production, would maintain supplier database
    const defaultSuppliers = [
      'Beauty Supply Co',
      'Professional Products Plus', 
      'Salon Direct'
    ];
    
    return item.thresholds?.preferred_suppliers || defaultSuppliers;
  }

  private async updateExternalInventory(platform: string, item: any) {
    // Placeholder for external platform integration
    console.log(`Updating ${item.name} quantity to ${item.new_quantity} on ${platform}`);
    
    // Would integrate with Shopify/Square POS APIs
    if (platform === 'shopify') {
      // await shopifyAPI.updateInventory(item.external_id, item.new_quantity);
    } else if (platform === 'square') {
      // await squareAPI.updateInventory(item.external_id, item.new_quantity);
    }
  }

  private getRecommendedStockForService(service: string, weeklyUsage: number): any {
    // Service-specific consumption patterns
    const consumptionRates: Record<string, Record<string, number>> = {
      'Hair Color': { 'hair_dye': 0.5, 'developer': 0.3, 'gloves': 2 },
      'Lash Extensions': { 'lash_strips': 1, 'lash_glue': 0.1, 'cleanser': 0.2 },
      'Manicure': { 'nail_polish': 0.2, 'base_coat': 0.1, 'top_coat': 0.1 }
    };

    const rates = consumptionRates[service] || {};
    
    return Object.entries(rates).map(([product, rate]) => ({
      product,
      weekly_consumption: Math.ceil(weeklyUsage * rate),
      recommended_stock: Math.ceil(weeklyUsage * rate * 4) // 4 weeks buffer
    }));
  }
}