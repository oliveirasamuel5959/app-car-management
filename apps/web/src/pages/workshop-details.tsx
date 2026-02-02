import { useRoute } from "wouter";
import { useWorkshop, useWorkshopReviews, useCreateAppointment } from "@/hooks/use-workshops";
import { useCars } from "@/hooks/use-cars";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Star, Calendar, Phone, Mail, Clock, Users, CheckCircle, Loader2 } from "lucide-react";
import { useState } from "react";

const appointmentSchema = z.object({
  date: z.string().min(1, "Please select a date"),
  time: z.string().min(1, "Please select a time"),
});

export default function WorkshopDetails() {
  const [, params] = useRoute("/workshops/:id");
  const id = Number(params?.id);
  const { data: workshop, isLoading } = useWorkshop(id);
  const { data: reviews } = useWorkshopReviews(id);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (isLoading) return <div className="p-12 text-center">Loading workshop details...</div>;
  if (!workshop) return <div className="p-12 text-center">Workshop not found</div>;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Hero Header */}
      <div className="relative h-64 md:h-80 rounded-3xl overflow-hidden shadow-xl">
        <img 
          src={workshop.image} 
          alt={workshop.name} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6 md:p-8 text-white w-full">
          <div className="flex flex-col md:flex-row justify-between items-end gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-primary px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Verified</span>
                <div className="flex items-center text-yellow-400">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="ml-1 font-bold">{workshop.stars}</span>
                  <span className="text-white/70 ml-1 text-sm">({reviews?.length || 0} reviews)</span>
                </div>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold font-display">{workshop.name}</h1>
              <div className="flex items-center gap-2 mt-2 text-white/80">
                <MapPin className="w-4 h-4" />
                {workshop.address}
              </div>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-white text-black hover:bg-white/90 font-bold">
                  Book Appointment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Book Service at {workshop.name}</DialogTitle>
                </DialogHeader>
                <BookingForm workshopId={workshop.id} onSuccess={() => setIsDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">About the Workshop</h2>
            <p className="text-muted-foreground leading-relaxed">
              {workshop.description}
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div className="p-4 bg-muted/50 rounded-xl text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="font-bold">{workshop.employeeCount}</div>
                <div className="text-xs text-muted-foreground">Employees</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl text-center">
                <Clock className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="font-bold">{workshop.marketTime}</div>
                <div className="text-xs text-muted-foreground">Experience</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl text-center">
                <CheckCircle className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="font-bold">Yes</div>
                <div className="text-xs text-muted-foreground">Warranty</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl text-center">
                <Car className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="font-bold">All</div>
                <div className="text-xs text-muted-foreground">Makes</div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Customer Reviews</h2>
            <div className="space-y-4">
              {reviews?.map((review) => (
                <div key={review.id} className="p-4 border rounded-xl bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>{review.userName[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-semibold">{review.userName}</span>
                    </div>
                    <div className="flex text-yellow-500">
                      {Array(5).fill(0).map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < review.rating ? "fill-current" : "text-muted"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm">{review.comment}</p>
                </div>
              ))}
              {!reviews?.length && (
                <p className="text-muted-foreground italic">No reviews yet.</p>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-bold text-lg mb-4">Contact Info</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Phone</div>
                  <div className="font-medium font-mono">+1 (555) 123-4567</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="font-medium">contact@{workshop.name.toLowerCase().replace(/\s/g, '')}.com</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Hours</div>
                  <div className="font-medium">Mon-Fri: 8am - 6pm</div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-slate-900 text-white border-none">
            <h3 className="font-bold text-lg mb-2">Owner</h3>
            <div className="flex items-center gap-3 mt-4">
              <Avatar className="h-12 w-12 border-2 border-white/20">
                <AvatarFallback>OW</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold">{workshop.owner}</p>
                <p className="text-sm text-slate-400">Master Mechanic</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Car(props: any) {
  return <Loader2 {...props} />; // Placeholder
}

function BookingForm({ workshopId, onSuccess }: { workshopId: number, onSuccess: () => void }) {
  const { mutate, isPending } = useCreateAppointment();
  const { data: cars } = useCars();
  
  const form = useForm({
    resolver: zodResolver(appointmentSchema),
    defaultValues: { date: "", time: "09:00" },
  });

  const onSubmit = (data: any) => {
    // Combine date and time
    const combinedDate = `${data.date}T${data.time}:00`;
    mutate({ 
      workshopId, 
      date: combinedDate,
      status: "pending"
    }, { onSuccess });
  };

  if (!cars || cars.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="mb-4">You need to register a car before booking.</p>
        <Button variant="outline" asChild>
          <a href="/cars">Register Car</a>
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <input 
                  type="date" 
                  className="w-full p-2 border rounded-md" 
                  min={new Date().toISOString().split('T')[0]}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Time</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="09:00">09:00 AM</SelectItem>
                  <SelectItem value="10:00">10:00 AM</SelectItem>
                  <SelectItem value="11:00">11:00 AM</SelectItem>
                  <SelectItem value="13:00">01:00 PM</SelectItem>
                  <SelectItem value="14:00">02:00 PM</SelectItem>
                  <SelectItem value="15:00">03:00 PM</SelectItem>
                  <SelectItem value="16:00">04:00 PM</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full mt-2" disabled={isPending}>
          {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Confirm Booking"}
        </Button>
      </form>
    </Form>
  );
}
