import { supabase } from "@/integrations/supabase/client";

/**
 * BrandVX Memory Manager - Handles layered memory system
 * Buffer (short) -> Summary (≤800 tokens) -> Entity (structured) -> Vector (top-k ≤6)
 */
export class MemoryManager {
  
  /**
   * Get structured entity attributes for a contact
   */
  async getEntity(contactId: string): Promise<Record<string, any>> {
    const { data } = await supabase
      .from('entity_store')
      .select('attributes')
      .eq('contact_id', contactId)
      .single();
    
    return (data?.attributes as Record<string, any>) || {};
  }

  /**
   * Update entity store with new attributes
   */
  async updateEntity(contactId: string, updates: Record<string, any>): Promise<void> {
    const existing = await this.getEntity(contactId);
    const merged = { ...existing, ...updates };
    
    await supabase
      .from('entity_store')
      .upsert({
        contact_id: contactId,
        attributes: merged,
        updated_at: new Date().toISOString()
      });
  }

  /**
   * Get rolling summary for a contact (≤800 tokens)
   */
  async getSummary(contactId: string): Promise<string> {
    const { data } = await supabase
      .from('summary_store')
      .select('summary')
      .eq('contact_id', contactId)
      .single();
    
    return data?.summary || '';
  }

  /**
   * Update summary with new interaction
   */
  async updateSummary(contactId: string, newEntry: string): Promise<void> {
    const existing = await this.getSummary(contactId);
    
    // Simple append for now (would use AI summarization in production)
    const updated = existing 
      ? `${existing}\n${new Date().toISOString()}: ${newEntry}`
      : `${new Date().toISOString()}: ${newEntry}`;
    
    // Truncate if too long (rough token estimate: 1 token ≈ 4 chars)
    const truncated = updated.length > 3200 ? updated.slice(-3200) : updated;
    
    await supabase
      .from('summary_store')
      .upsert({
        contact_id: contactId,
        summary: truncated,
        updated_at: new Date().toISOString()
      });
  }

  /**
   * Get top-k vector embeddings for semantic recall
   * Note: This is a placeholder - would use pgvector in production
   */
  async getTopVectors(contactId: string, k: number = 6): Promise<Array<{ content: string; score: number }>> {
    // Placeholder implementation
    // In production, this would:
    // 1. Generate embedding for current context
    // 2. Perform similarity search in pgvector
    // 3. Return top-k most relevant content chunks
    
    return [
      { content: 'Previous appointment: Hair color consultation', score: 0.85 },
      { content: 'Preference: Prefers Saturday appointments', score: 0.78 },
      { content: 'Treatment history: Balayage, highlights', score: 0.72 }
    ].slice(0, k);
  }

  /**
   * Store new content for vector search
   */
  async storeVector(contactId: string, content: string): Promise<void> {
    // Placeholder - would generate embeddings and store in pgvector table
    console.log(`Storing vector for contact ${contactId}: ${content.slice(0, 50)}...`);
  }

  /**
   * Get recent buffer messages for fast recall
   */
  async getBuffer(contactId: string, limit: number = 10): Promise<Array<any>> {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    return data || [];
  }

  /**
   * Clear memory for a contact (GDPR compliance)
   */
  async clearMemory(contactId: string): Promise<void> {
    await Promise.all([
      supabase.from('entity_store').delete().eq('contact_id', contactId),
      supabase.from('summary_store').delete().eq('contact_id', contactId),
      // Vector store would be cleared here too
    ]);
  }

  /**
   * Compress and archive old memory data
   */
  async compressMemory(contactId: string): Promise<void> {
    // Archive old buffer messages to summary
    const buffer = await this.getBuffer(contactId, 50);
    if (buffer.length > 20) {
      const oldMessages = buffer.slice(20);
      const summary = oldMessages
        .map(msg => `${msg.direction}: ${msg.body}`)
        .join('\n');
      
      await this.updateSummary(contactId, `Archived: ${summary}`);
    }
  }
}