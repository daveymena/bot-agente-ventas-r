import { useState } from "react";
import { useListContacts, useCreateContact, useUpdateContact } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserPlus, Tag, Mail, Phone, Edit2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

export default function Contacts() {
  const { data, isLoading } = useListContacts();
  const [search, setSearch] = useState("");
  
  const contacts = data?.contacts.filter(c => 
    c.phone.includes(search) || c.name?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Contacts</h1>
          <p className="text-muted-foreground mt-1">Manage your leads and customers.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search contacts..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-card/50 border-border/50"
            />
          </div>
          <ContactDialog mode="create" />
        </div>
      </div>

      <Card className="bg-card/40 backdrop-blur-sm border-border/50 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">Contact Info</th>
                <th className="px-6 py-4 font-medium">Stage</th>
                <th className="px-6 py-4 font-medium">Tags</th>
                <th className="px-6 py-4 font-medium">Purchases</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
              ) : contacts.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No contacts found.</td></tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                          {contact.name ? contact.name.charAt(0).toUpperCase() : '#'}
                        </div>
                        <div>
                          <div className="font-bold text-foreground">{contact.name || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground">Added {format(new Date(contact.createdAt), 'MMM d, yyyy')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-3 h-3" /> <span className="font-mono">{contact.phone}</span>
                      </div>
                      {contact.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-3 h-3" /> <span>{contact.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StageBadge stage={contact.stage} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags?.map(tag => (
                          <span key={tag} className="inline-flex items-center gap-1 text-[10px] font-medium bg-secondary px-2 py-1 rounded-full text-foreground border border-border/50">
                            <Tag className="w-3 h-3 text-muted-foreground" /> {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium">{contact.totalPurchases}</td>
                    <td className="px-6 py-4 text-right">
                      <ContactDialog mode="edit" contact={contact} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const colors: Record<string, string> = {
    lead: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    prospect: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    customer: 'bg-primary/10 text-primary border-primary/20',
    vip: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${colors[stage] || colors.lead}`}>
      {stage}
    </span>
  );
}

function ContactDialog({ mode, contact }: { mode: 'create' | 'edit', contact?: any }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const createMut = useCreateContact({ mutation: { onSuccess: () => { setOpen(false); queryClient.invalidateQueries({queryKey: ['/api/contacts']}); } } });
  const updateMut = useUpdateContact({ mutation: { onSuccess: () => { setOpen(false); queryClient.invalidateQueries({queryKey: ['/api/contacts']}); } } });

  const [formData, setFormData] = useState({
    phone: contact?.phone || "",
    name: contact?.name || "",
    email: contact?.email || "",
    stage: contact?.stage || "lead"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      createMut.mutate({ data: formData as any });
    } else {
      updateMut.mutate({ id: contact.id, data: formData as any });
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === 'create' ? (
          <Button className="gap-2 shadow-lg shadow-primary/20"><UserPlus className="w-4 h-4" /> New Contact</Button>
        ) : (
          <Button variant="ghost" size="icon" className="hover:bg-secondary"><Edit2 className="w-4 h-4" /></Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card border-border/50">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add New Contact' : 'Edit Contact'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
            <Input 
              required 
              disabled={mode === 'edit'}
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              placeholder="+1234567890"
              className="bg-background border-border/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Full Name</label>
            <Input 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="John Doe"
              className="bg-background border-border/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Email (Optional)</label>
            <Input 
              type="email"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              placeholder="john@example.com"
              className="bg-background border-border/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Sales Stage</label>
            <Select value={formData.stage} onValueChange={v => setFormData({...formData, stage: v})}>
              <SelectTrigger className="bg-background border-border/50">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Contact
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
