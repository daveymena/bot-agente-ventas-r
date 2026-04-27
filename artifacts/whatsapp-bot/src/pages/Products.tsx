import { useState } from "react";
import { useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Edit2, Trash2, Loader2, Image as ImageIcon, Upload, CheckCircle2, XCircle, Filter, Star, Grid3x3, List, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// Categorías predefinidas con colores e iconos
const CATEGORIES = [
  { name: "DISEÑO", slug: "diseno", icon: "🎨", color: "#8B5CF6" },
  { name: "OFFICE", slug: "office", icon: "💼", color: "#3B82F6" },
  { name: "IDIOMAS", slug: "idiomas", icon: "🌍", color: "#10B981" },
  { name: "EXCEL", slug: "excel", icon: "📊", color: "#059669" },
  { name: "TECH", slug: "tech", icon: "💻", color: "#6366F1" },
  { name: "MARKETING", slug: "marketing", icon: "📱", color: "#EC4899" },
  { name: "MÚSICA", slug: "musica", icon: "🎵", color: "#F59E0B" },
  { name: "SALUD", slug: "salud", icon: "🏥", color: "#EF4444" },
  { name: "NEGOCIOS", slug: "negocios", icon: "💰", color: "#14B8A6" },
  { name: "INGENIERÍA", slug: "ingenieria", icon: "⚙️", color: "#64748B" },
  { name: "EDUCATIVO", slug: "educativo", icon: "📚", color: "#8B5CF6" },
  { name: "OFICIO", slug: "oficio", icon: "🔧", color: "#F97316" },
  { name: "CRAFT", slug: "craft", icon: "✂️", color: "#A855F7" },
];

function JsonImportButton({ onDone }: { onDone: () => void }) {
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setStatus(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch(`${BASE}/api/products/import/json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ ok: true, msg: `✓ ${data.imported} productos importados` });
        onDone();
      } else {
        setStatus({ ok: false, msg: data.error || "Error importing" });
      }
    } catch (err) {
      setStatus({ ok: false, msg: "JSON inválido o error de red" });
    }
    setLoading(false);
    e.target.value = "";
  }

  return (
    <div className="flex items-center gap-2">
      {status && (
        <span className={`text-xs font-medium flex items-center gap-1 ${status.ok ? "text-primary" : "text-destructive"}`}>
          {status.ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          {status.msg}
        </span>
      )}
      <label className={`cursor-pointer flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-border/50 glass-effect hover:border-primary/50 transition-all ${loading ? "opacity-60 pointer-events-none" : ""}`}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Importar JSON
        <input type="file" accept=".json" className="hidden" onChange={handleFile} />
      </label>
    </div>
  );
}

export default function Products() {
  const { data, isLoading, refetch } = useListProducts();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  const products = data?.products ?? (Array.isArray(data) ? data : []);

  const filteredProducts = products.filter((product: any) => {
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      (product.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categoryStats = CATEGORIES.map(cat => ({
    ...cat,
    count: products.filter((p: any) => p.category === cat.name).length || 0
  }));

  return (
    <div className="space-y-6">
      {/* Header con gradiente */}
      <div className="relative overflow-hidden rounded-2xl p-8 gradient-primary">
        <div className="relative z-10">
          <h1 className="text-4xl font-display font-bold text-white mb-2">Catálogo de Productos</h1>
          <p className="text-white/90 text-lg">Gestiona tu inventario de cursos digitales</p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
      </div>

      {/* Barra de acciones */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar productos..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 glass-effect border-border/50 focus:border-primary/50"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48 glass-effect border-border/50">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.slug} value={cat.name}>
                  <span className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 glass-effect rounded-xl p-1">
            <Button
              size="sm"
              variant={viewMode === "grid" ? "default" : "ghost"}
              onClick={() => setViewMode("grid")}
              className="h-8 w-8 p-0"
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              onClick={() => setViewMode("list")}
              className="h-8 w-8 p-0"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          <JsonImportButton onDone={() => refetch()} />
          <ProductDialog mode="create" />
        </div>
      </div>

      {/* Estadísticas de categorías */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-7 gap-3">
        {categoryStats.map(cat => (
          <button
            key={cat.slug}
            onClick={() => setSelectedCategory(selectedCategory === cat.name ? "all" : cat.name)}
            className={`glass-effect rounded-xl p-4 text-center transition-all hover:scale-105 ${
              selectedCategory === cat.name ? 'ring-2 ring-primary' : ''
            }`}
          >
            <div className="text-3xl mb-2">{cat.icon}</div>
            <div className="text-xs font-medium text-muted-foreground mb-1">{cat.name}</div>
            <div className="text-lg font-bold" style={{ color: cat.color }}>{cat.count}</div>
          </button>
        ))}
      </div>

      {/* Lista de productos */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
               Mostrando {filteredProducts.length} de {products.length} productos
            </p>
          </div>
          
          <div className={viewMode === "grid" 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
            : "space-y-4"
          }>
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} viewMode={viewMode} />
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-16 text-center">
                <div className="glass-effect rounded-2xl p-12 max-w-md mx-auto">
                  <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-lg font-medium text-foreground mb-2">No se encontraron productos</p>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "Intenta con otra búsqueda" : "Agrega productos para comenzar"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ProductCard({ product, viewMode }: { product: any; viewMode: "grid" | "list" }) {
  const queryClient = useQueryClient();
  const deleteMut = useDeleteProduct({ mutation: { onSuccess: () => queryClient.invalidateQueries({queryKey: ['/api/products']}) } });

  const category = CATEGORIES.find(c => c.name === product.category);

  if (viewMode === "list") {
    return (
      <Card className="glass-effect border-border/50 overflow-hidden hover:border-primary/30 transition-all">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-secondary/50 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 mb-2">
                <h3 className="font-bold text-lg text-foreground leading-tight flex-1">{product.name}</h3>
                <span className="font-mono text-primary font-bold text-lg whitespace-nowrap">${product.price.toLocaleString()}</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{product.description || 'Sin descripción'}</p>
              <div className="flex items-center gap-2">
                {category && (
                  <Badge style={{ backgroundColor: category.color + '20', color: category.color, borderColor: category.color + '40' }} className="border">
                    {category.icon} {category.name}
                  </Badge>
                )}
                {product.featured && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="w-3 h-3 fill-current" /> Destacado
                  </Badge>
                )}
                {!product.inStock && (
                  <Badge variant="destructive">Sin stock</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <ProductDialog mode="edit" product={product} trigger={
                <Button size="icon" variant="secondary" className="w-9 h-9 rounded-xl">
                  <Edit2 className="w-4 h-4" />
                </Button>
              } />
              <Button 
                size="icon" 
                variant="destructive" 
                className="w-9 h-9 rounded-xl"
                onClick={() => deleteMut.mutate({ id: product.id })}
                disabled={deleteMut.isPending}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-effect border-border/50 overflow-hidden group hover:border-primary/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10">
      <div className="aspect-square bg-secondary/50 relative flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
        ) : (
          <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
        )}
        {product.featured && (
          <div className="absolute top-3 left-3">
            <Badge className="gap-1 bg-yellow-500/90 text-yellow-950 border-0">
              <Star className="w-3 h-3 fill-current" /> Destacado
            </Badge>
          </div>
        )}
        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ProductDialog mode="edit" product={product} trigger={
            <Button size="icon" variant="secondary" className="w-8 h-8 rounded-full shadow-lg backdrop-blur-sm">
              <Edit2 className="w-4 h-4" />
            </Button>
          } />
          <Button 
            size="icon" 
            variant="destructive" 
            className="w-8 h-8 rounded-full shadow-lg"
            onClick={() => deleteMut.mutate({ id: product.id })}
            disabled={deleteMut.isPending}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        {!product.inStock && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <Badge variant="destructive" className="text-xs font-bold uppercase tracking-widest shadow-lg">Sin Stock</Badge>
          </div>
        )}
      </div>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg text-foreground leading-tight flex-1 pr-2">{product.name}</h3>
          <span className="font-mono text-primary font-bold bg-primary/10 px-2.5 py-1 rounded-lg text-sm whitespace-nowrap">${product.price.toLocaleString()}</span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[2.5rem]">{product.description || 'Sin descripción disponible.'}</p>
        <div className="flex items-center gap-2">
          {category && (
            <Badge 
              style={{ 
                backgroundColor: category.color + '20', 
                color: category.color, 
                borderColor: category.color + '40' 
              }} 
              className="text-[10px] uppercase tracking-wider font-bold border"
            >
              {category.icon} {category.name}
            </Badge>
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
    inStock: product?.inStock ?? true,
    featured: product?.featured ?? false,
    tags: product?.tags || ""
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
        {trigger || (
          <Button className="gap-2 shadow-lg shadow-primary/20 gradient-primary border-0">
            <Plus className="w-4 h-4" /> Agregar Producto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] glass-effect border-border/50 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {mode === 'create' ? 'Crear Producto' : 'Editar Producto'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium text-foreground">Nombre del Producto</label>
              <Input 
                required 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                className="bg-background/50 border-border/50 focus:border-primary/50" 
                placeholder="Ej: Curso de Diseño Gráfico"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Precio (COP)</label>
              <Input 
                required 
                type="number" 
                step="1" 
                value={formData.price} 
                onChange={e => setFormData({...formData, price: Number(e.target.value)})} 
                className="bg-background/50 border-border/50 focus:border-primary/50 font-mono" 
                placeholder="20000"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Categoría</label>
              <Select value={formData.category} onValueChange={c => setFormData({...formData, category: c})}>
                <SelectTrigger className="bg-background/50 border-border/50">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.slug} value={cat.name}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium text-foreground">Descripción</label>
              <textarea 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                className="w-full min-h-[100px] px-3 py-2 rounded-xl bg-background/50 border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm resize-none"
                placeholder="Descripción detallada del producto..."
              />
            </div>
            
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium text-foreground">URL de Imagen</label>
              <Input 
                value={formData.imageUrl} 
                onChange={e => setFormData({...formData, imageUrl: e.target.value})} 
                className="bg-background/50 border-border/50 focus:border-primary/50" 
                placeholder="/products/imagen.png o https://..."
              />
            </div>

            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium text-foreground">Tags (separados por coma)</label>
              <Input 
                value={formData.tags} 
                onChange={e => setFormData({...formData, tags: e.target.value})} 
                className="bg-background/50 border-border/50 focus:border-primary/50" 
                placeholder="diseño, photoshop, adobe"
              />
            </div>
            
            <div className="flex items-center gap-3 col-span-2 glass-effect p-4 rounded-xl">
              <Switch checked={formData.inStock} onCheckedChange={c => setFormData({...formData, inStock: c})} />
              <label className="text-sm font-medium text-foreground">Disponible en stock</label>
            </div>

            <div className="flex items-center gap-3 col-span-2 glass-effect p-4 rounded-xl">
              <Switch checked={formData.featured} onCheckedChange={c => setFormData({...formData, featured: c})} />
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Star className="w-4 h-4" />
                Producto destacado
              </label>
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-border/50">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="gradient-primary border-0">
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === 'create' ? 'Crear Producto' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
