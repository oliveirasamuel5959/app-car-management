import { useState } from "react";
import { useCars, useCreateCar } from "@/hooks/use-cars";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertCarSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Car as CarIcon, Plus, Loader2, Trash2 } from "lucide-react";

// Form schema - coerce numbers
const formSchema = insertCarSchema.omit({ userId: true }).extend({
  year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
});

export default function CarsPage() {
  const { data: cars, isLoading } = useCars();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Vehicles</h1>
          <p className="text-muted-foreground mt-1">Manage your registered cars and their details.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" />
              Register New Car
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Vehicle</DialogTitle>
            </DialogHeader>
            <CreateCarForm onSuccess={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : !cars?.length ? (
        <Card className="border-dashed py-16 text-center bg-muted/20">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
            <CarIcon className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-semibold">No vehicles found</h3>
          <p className="text-muted-foreground mt-2 mb-6">Get started by registering your first car.</p>
          <Button onClick={() => setIsDialogOpen(true)}>Register Car</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cars.map((car) => (
            <Card key={car.id} className="group overflow-hidden border hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
              <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-200 relative flex items-center justify-center">
                <CarIcon className="w-16 h-16 text-slate-300" />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-mono font-bold shadow-sm">
                  {car.plate}
                </div>
              </div>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{car.model}</h3>
                    <p className="text-muted-foreground">{car.year} • {car.color}</p>
                  </div>
                </div>
                
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Owner</span>
                    <span className="font-medium">{car.owner}</span>
                  </div>
                </div>

                <div className="mt-6 flex gap-2">
                  <Button variant="outline" className="flex-1">Details</Button>
                  <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 px-3">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateCarForm({ onSuccess }: { onSuccess: () => void }) {
  const { mutate, isPending } = useCreateCar();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      model: "",
      plate: "",
      color: "",
      owner: "",
      year: new Date().getFullYear(),
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    mutate(data, { onSuccess });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Car Model</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Toyota Camry" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="plate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plate Number</FormLabel>
                <FormControl>
                  <Input placeholder="ABC-1234" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Silver" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="owner"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Registered Owner</FormLabel>
                <FormControl>
                  <Input placeholder="Owner Name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="w-full mt-4" disabled={isPending}>
          {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Register Vehicle"}
        </Button>
      </form>
    </Form>
  );
}
