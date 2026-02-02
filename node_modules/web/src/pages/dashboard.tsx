import { useAuth } from "@/hooks/use-auth";
import { useCars } from "@/hooks/use-cars";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Car, Calendar, MapPin, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: cars } = useCars();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Welcome back, {user?.name.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Here's what's happening with your vehicles today.
          </p>
        </div>
        <Link href="/cars">
          <Button className="shadow-lg shadow-primary/25">
            <Plus className="w-4 h-4 mr-2" />
            Add New Car
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 border-none text-white shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-blue-100 font-medium">Total Vehicles</p>
              <h3 className="text-3xl font-bold">{cars?.length || 0}</h3>
            </div>
          </div>
        </Card>
        
        <Card className="p-6 border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-xl text-orange-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-muted-foreground font-medium">Upcoming Services</p>
              <h3 className="text-3xl font-bold text-foreground">0</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl text-green-600">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <p className="text-muted-foreground font-medium">Nearby Workshops</p>
              <h3 className="text-3xl font-bold text-foreground">12</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Cars Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Your Garage</h2>
          <Link href="/cars" className="text-primary hover:underline text-sm font-medium flex items-center">
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {!cars || cars.length === 0 ? (
          <Card className="p-12 flex flex-col items-center justify-center text-center border-dashed">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 text-muted-foreground">
              <Car className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold">No cars registered yet</h3>
            <p className="text-muted-foreground max-w-sm mt-2 mb-6">
              Add your first vehicle to start tracking maintenance and booking services.
            </p>
            <Link href="/cars">
              <Button>Register Your First Car</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cars.map((car) => (
              <Card key={car.id} className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-primary">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{car.model}</h3>
                    <p className="text-muted-foreground">{car.year} • {car.color}</p>
                  </div>
                  <span className="px-2 py-1 bg-muted rounded text-xs font-mono font-medium">
                    {car.plate}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <UserIcon className="w-4 h-4" />
                  Owned by {car.owner}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Promo Banner */}
      <div className="rounded-2xl bg-slate-900 text-white p-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold mb-2">Need a checkup?</h3>
            <p className="text-slate-300 max-w-md">
              Find top-rated workshops near you and book an appointment in seconds.
            </p>
          </div>
          <Link href="/workshops">
            <Button size="lg" variant="secondary" className="whitespace-nowrap">
              Find Workshops
            </Button>
          </Link>
        </div>
        
        {/* Decorative circle */}
        <div className="absolute -right-10 -bottom-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}

function UserIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
