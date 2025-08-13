import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  User, 
  Calendar,
  MessageSquare,
  Filter,
  Download,
  Users
} from "lucide-react";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  tags: string[];
  sources: string[];
  created_at: string;
  updated_at: string;
}

export function ContactManager() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // New contact form
  const [newContact, setNewContact] = useState({
    name: "",
    email: "",
    phone: "",
    status: "lead",
    tags: ""
  });

  useEffect(() => {
    if (user) {
      loadContacts();
    }
  }, [user]);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchTerm, selectedStatus]);

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  const filterContacts = () => {
    let filtered = contacts;

    if (searchTerm) {
      filtered = filtered.filter(contact =>
        contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phone?.includes(searchTerm)
      );
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter(contact => contact.status === selectedStatus);
    }

    setFilteredContacts(filtered);
  };

  const addContact = async () => {
    if (!newContact.name || !newContact.email) {
      toast.error("Name and email are required");
      return;
    }

    try {
      const contactData = {
        user_id: user?.id,
        name: newContact.name,
        email: newContact.email,
        phone: newContact.phone || null,
        status: newContact.status,
        tags: newContact.tags ? newContact.tags.split(',').map(t => t.trim()) : [],
        sources: ['manual'],
        consent_flags: {
          marketing: true,
          sms: !!newContact.phone,
          email: true
        }
      };

      const { data, error } = await supabase
        .from('contacts')
        .insert(contactData)
        .select()
        .single();

      if (error) throw error;

      // Initialize lead status for new contact
      const { error: leadStatusError } = await supabase
        .from('lead_status')
        .insert({
          contact_id: data.id,
          bucket: 1,
          tag: 'new',
          cadence_step: 1,
          total_attempts: 0,
          next_action_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          reason: 'Manual contact creation'
        });

      if (leadStatusError) {
        console.error('Error creating lead status:', leadStatusError);
      }

      setContacts([data, ...contacts]);
      setNewContact({ name: "", email: "", phone: "", status: "lead", tags: "" });
      setIsAddDialogOpen(false);
      toast.success("Contact added successfully!");

      // Log event
      await supabase
        .from('events')
        .insert({
          user_id: user?.id,
          type: 'contact_created',
          source: 'manual',
          metadata: { contact_id: data.id, method: 'manual_entry' },
          baseline_min: 5,
          auto_min: 1
        });

    } catch (error) {
      console.error('Error adding contact:', error);
      toast.error("Failed to add contact");
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'lead': 'bg-blue-100 text-blue-700',
      'client': 'bg-green-100 text-green-700',
      'prospect': 'bg-yellow-100 text-yellow-700',
      'inactive': 'bg-gray-100 text-gray-700'
    };
    return colors[status as keyof typeof colors] || colors.lead;
  };

  const contactStats = {
    total: contacts.length,
    leads: contacts.filter(c => c.status === 'lead').length,
    clients: contacts.filter(c => c.status === 'client').length,
    prospects: contacts.filter(c => c.status === 'prospect').length
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-6 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-beauty-rose" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Contacts</p>
                <p className="text-2xl font-bold">{contactStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Leads</p>
                <p className="text-2xl font-bold text-blue-600">{contactStats.leads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clients</p>
                <p className="text-2xl font-bold text-green-600">{contactStats.clients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Prospects</p>
                <p className="text-2xl font-bold text-yellow-600">{contactStats.prospects}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header & Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Contact Management</CardTitle>
              <CardDescription>
                Manage your leads, clients, and prospects
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-beauty hover:opacity-90">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Contact
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Contact</DialogTitle>
                    <DialogDescription>
                      Add a new contact to your database
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={newContact.name}
                        onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                        placeholder="Contact name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newContact.email}
                        onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                        placeholder="contact@email.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newContact.phone}
                        onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={newContact.status} onValueChange={(value) => setNewContact({...newContact, status: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="prospect">Prospect</SelectItem>
                          <SelectItem value="client">Client</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags (comma separated)</Label>
                      <Input
                        id="tags"
                        value={newContact.tags}
                        onChange={(e) => setNewContact({...newContact, tags: e.target.value})}
                        placeholder="new lead, instagram, referral"
                      />
                    </div>
                    <Button onClick={addContact} className="w-full bg-gradient-beauty hover:opacity-90">
                      Add Contact
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="lead">Leads</SelectItem>
                <SelectItem value="prospect">Prospects</SelectItem>
                <SelectItem value="client">Clients</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Contact List */}
          <div className="space-y-4">
            {filteredContacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {contacts.length === 0 ? "No contacts yet. Add your first contact!" : "No contacts match your filters."}
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <Card key={contact.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-beauty-blush/20 rounded-full p-2">
                          <User className="h-5 w-5 text-beauty-rose" />
                        </div>
                        <div>
                          <h4 className="font-medium">{contact.name}</h4>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                            {contact.email && (
                              <div className="flex items-center space-x-1">
                                <Mail className="h-4 w-4" />
                                <span>{contact.email}</span>
                              </div>
                            )}
                            {contact.phone && (
                              <div className="flex items-center space-x-1">
                                <Phone className="h-4 w-4" />
                                <span>{contact.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(contact.status)}>
                          {contact.status}
                        </Badge>
                        {contact.tags && contact.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {contact.tags.slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {contact.tags.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{contact.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ContactManager;