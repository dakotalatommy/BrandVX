import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, Plus, Play, Pause, Trash2, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AutomationRule {
  id: string;
  name: string;
  trigger_type: string;
  trigger_conditions: any;
  actions: any[];
  is_active: boolean;
}

export function AutomationCenter() {
  const { user } = useAuth();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    trigger_type: 'contact_created',
    trigger_conditions: {},
    actions: [],
    is_active: true
  });

  useEffect(() => {
    if (user) {
      loadAutomationRules();
    }
  }, [user]);

  const loadAutomationRules = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules((data || []).map(rule => ({
        ...rule,
        actions: Array.isArray(rule.actions) ? rule.actions : [],
        trigger_conditions: rule.trigger_conditions || {}
      })) as AutomationRule[]);
    } catch (error) {
      console.error('Error loading automation rules:', error);
      toast.error('Failed to load automation rules');
    } finally {
      setIsLoading(false);
    }
  };

  const createRule = async () => {
    try {
      const { error } = await supabase
        .from('automation_rules')
        .insert({
          user_id: user?.id,
          ...newRule
        });

      if (error) throw error;
      
      toast.success('Automation rule created successfully');
      setShowCreateForm(false);
      setNewRule({
        name: '',
        trigger_type: 'contact_created',
        trigger_conditions: {},
        actions: [],
        is_active: true
      });
      loadAutomationRules();
    } catch (error) {
      console.error('Error creating rule:', error);
      toast.error('Failed to create automation rule');
    }
  };

  const toggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('automation_rules')
        .update({ is_active: isActive })
        .eq('id', ruleId);

      if (error) throw error;
      
      setRules(prev => prev.map(rule => 
        rule.id === ruleId ? { ...rule, is_active: isActive } : rule
      ));
      
      toast.success(`Rule ${isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast.error('Failed to update rule');
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('automation_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
      
      setRules(prev => prev.filter(rule => rule.id !== ruleId));
      toast.success('Rule deleted successfully');
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  const addAction = () => {
    setNewRule(prev => ({
      ...prev,
      actions: [...prev.actions, { type: 'send_message', params: {} }]
    }));
  };

  const updateAction = (index: number, action: any) => {
    setNewRule(prev => ({
      ...prev,
      actions: prev.actions.map((a, i) => i === index ? action : a)
    }));
  };

  const removeAction = (index: number) => {
    setNewRule(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  const triggerTypes = [
    { value: 'contact_created', label: 'New Contact Created' },
    { value: 'appointment_scheduled', label: 'Appointment Scheduled' },
    { value: 'appointment_completed', label: 'Appointment Completed' },
    { value: 'payment_received', label: 'Payment Received' },
    { value: 'lead_status_changed', label: 'Lead Status Changed' },
    { value: 'time_based', label: 'Time-Based Trigger' }
  ];

  const actionTypes = [
    { value: 'send_message', label: 'Send Message' },
    { value: 'update_lead_status', label: 'Update Lead Status' },
    { value: 'create_task', label: 'Create Task' },
    { value: 'trigger_cadence', label: 'Start Cadence' }
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6" />
            Automation Center
          </h2>
          <p className="text-muted-foreground">Create intelligent workflows to automate your business</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Rule
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Automation Rule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rule-name">Rule Name</Label>
                <Input
                  id="rule-name"
                  value={newRule.name}
                  onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Welcome New Leads"
                />
              </div>
              <div>
                <Label htmlFor="trigger-type">Trigger</Label>
                <Select 
                  value={newRule.trigger_type}
                  onValueChange={(value) => setNewRule(prev => ({ ...prev, trigger_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Actions</Label>
              <div className="space-y-3">
                {newRule.actions.map((action, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <Select 
                        value={action.type}
                        onValueChange={(value) => updateAction(index, { ...action, type: value })}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {actionTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAction(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {action.type === 'send_message' && (
                      <div className="space-y-2">
                        <Input
                          placeholder="Channel (email, sms)"
                          value={action.params?.channel || ''}
                          onChange={(e) => updateAction(index, {
                            ...action,
                            params: { ...action.params, channel: e.target.value }
                          })}
                        />
                        <Textarea
                          placeholder="Message template"
                          value={action.params?.template || ''}
                          onChange={(e) => updateAction(index, {
                            ...action,
                            params: { ...action.params, template: e.target.value }
                          })}
                        />
                      </div>
                    )}

                    {action.type === 'update_lead_status' && (
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Bucket (1-5)"
                          type="number"
                          value={action.params?.bucket || ''}
                          onChange={(e) => updateAction(index, {
                            ...action,
                            params: { ...action.params, bucket: parseInt(e.target.value) }
                          })}
                        />
                        <Input
                          placeholder="Tag"
                          value={action.params?.tag || ''}
                          onChange={(e) => updateAction(index, {
                            ...action,
                            params: { ...action.params, tag: e.target.value }
                          })}
                        />
                      </div>
                    )}
                  </div>
                ))}

                <Button variant="outline" onClick={addAction} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Action
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={createRule} disabled={!newRule.name || newRule.actions.length === 0}>
                Create Rule
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {rules.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No automation rules yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first automation rule to start saving time
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                Create Your First Rule
              </Button>
            </CardContent>
          </Card>
        ) : (
          rules.map(rule => (
            <Card key={rule.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{rule.name}</h3>
                      <Badge variant={rule.is_active ? "default" : "secondary"}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Trigger: {triggerTypes.find(t => t.value === rule.trigger_type)?.label}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Actions: {rule.actions.length} configured
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}