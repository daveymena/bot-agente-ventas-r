import { useState } from "react";
import { useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Package, Edit2, Trash2, Loader2, Image as ImageIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Products() {
  const { data, isLoading } = useListProducts();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Catalog</h1>
          <p className="text-muted-foreground mt-1">Products available for the bot to sell.</p>
        </div>
        <ProductDialog mode="create" />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {data?.products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
          {data?.products.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-2xl">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Your catalog is empty. Add some products!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: any }) {
  const queryClient = useQueryClient();
  const deleteMut = useDeleteProduct({ mutation: { onSuccess: () => queryClient.invalidateQueries({queryKey: ['/api/products']}) } });

  return (
    <Card className="bg-card/40 backdrop-blur-sm border-border/50 overflow-hidden shadow-lg group hover:border-primary/30 transition-all hover:-translate-y-1">
      <div className="aspect-square bg-secondary/50 relative flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
        )}
        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ProductDialog mode="edit" product={product} trigger={
            <Button size="icon" variant="secondary" className="w-8 h-8 rounded-full shadow-md"><Edit2 className="w-4 h-4" /></Button>
          } />
          <Button 
            size="icon" 
            variant="destructive" 
            className="w-8 h-8 rounded-full shadow-md"
            onClick={() => deleteMut.mutate({ id: product.id })}
            disabled={deleteMut.isPending}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        {!product.inStock && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">Out of Stock</span>
          </div>
        )}
      </div>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg text-foreground leading-tight">{product.name}</h3>
          <span className="font-mono text-primary font-bold bg-primary/10 px-2 py-1 rounded text-sm">${product.price.toFixed(2)}</span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{product.description || 'No description available.'}</p>
        <div className="mt-4 flex items-center gap-2">
          {product.category && (
             <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground bg-secondary px-2 py-1 rounded-md border border-border/50">
               {product.category}
             </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProductDialog({ mode, product, trigger }: { mode: 'create' | 'edit', product?: any, trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    price: product?.price || 0,
    category: product?.category || "",
    imageUrl: product?.imageUrl || "",
    inStock: product?.inStock ?? true
  });

  const createMut = useCreateProduct({ mutation: { onSuccess: () => { setOpen(false); queryClient.invalidateQueries({queryKey: ['/api/products']}); } } });
  const updateMut = useUpdateProduct({ mutation: { onSuccess: () => { setOpen(false); queryClient.invalidateQueries({queryKey: ['/api/products']}); } } });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      createMut.mutate({ data: { ...formData, price: Number(formData.price) } as any });
    } else {
      updateMut.mutate({ id: product.id, data: { ...formData, price: Number(formData.price) } as any });
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button className="gap-2 shadow-lg shadow-primary/20"><Plus className="w-4 h-4" /> Add Product</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card border-border/50">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Product' : 'Edit Product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Product Name</label>
              <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-background border-border/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Price ($)</label>
              <Input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="bg-background border-border/50 font-mono" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Category</label>
              <Input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="bg-background border-border/50" placeholder="e.g. Electronics" />
            </div>
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="bg-background border-border/50" />
            </div>
            <div className="space-y-2 col-span-2">
              {/* using unsplash url comment as requested */}
              {/* product placeholder photo */}
              <label className="text-sm font-medium text-muted-foreground">Image URL (Optional)</label>
              <Input value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="bg-background border-border/50" placeholder="https://images.unsplash.com/..." />
            </div>
            <div className="flex items-center gap-3 col-span-2 bg-secondary/50 p-4 rounded-xl border border-border/50">
              <Switch checked={formData.inStock} onCheckedChange={c => setFormData({...formData, inStock: c})} />
              <label className="text-sm font-medium text-foreground">In Stock (Available for sale)</label>
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Product
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
