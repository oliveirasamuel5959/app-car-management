import { useState } from "react";
import { useWorkshops } from "@/hooks/use-workshops";
import { Link } from "wouter";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Star, Users, Clock } from "lucide-react";
import "leaflet/dist/leaflet.css";
// Fix Leaflet icon issue
import L from "leaflet";

// Fix for default markers in react-leaflet not showing
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function WorkshopsPage() {
  const [search, setSearch] = useState("");
  const { data: workshops, isLoading } = useWorkshops(search);

  // Default center (San Francisco for demo)
  const center = { lat: -7.21189, lng: -36.6294 };

  return (
    <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] flex flex-col md:flex-row gap-6 animate-in fade-in duration-500">
      
      {/* Sidebar List */}
      <div className="w-full md:w-1/3 flex flex-col gap-4 overflow-hidden h-full">
        <div>
          <h1 className="text-2xl font-bold mb-4">Find a Workshop</h1>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or location..." 
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-40 bg-muted" />
                <CardContent className="p-4 space-y-2">
                  <div className="h-4 bg-muted w-2/3" />
                  <div className="h-4 bg-muted w-1/2" />
                </CardContent>
              </Card>
            ))
          ) : workshops?.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No workshops found.
            </div>
          ) : (
            workshops?.map((workshop) => (
              <Link key={workshop.id} href={`/workshops/${workshop.id}`}>
                <Card className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all duration-200 group">
                  <div className="relative h-40 overflow-hidden">
                    {/* workshop placeholder garage image */}
                    <img 
                      src={workshop.image} 
                      alt={workshop.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 shadow-sm">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      {workshop.stars}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-1">{workshop.name}</h3>
                    <div className="flex items-center text-sm text-muted-foreground mb-3">
                      <MapPin className="w-3 h-3 mr-1" />
                      <span className="truncate">{workshop.address}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground border-t pt-3">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {workshop.employeeCount} Staff
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {workshop.marketTime} Exp.
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Map View */}
      <div className="hidden md:block w-2/3 h-full rounded-2xl overflow-hidden border shadow-lg relative">
        <MapContainer center={[center.lat, center.lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          {workshops?.map((workshop) => (
            <Marker 
              key={workshop.id} 
              position={[Number(workshop.lat), Number(workshop.lng)]}
              icon={icon}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <h3 className="font-bold mb-1">{workshop.name}</h3>
                  <p className="text-xs text-gray-500 mb-2">{workshop.address}</p>
                  <Link href={`/workshops/${workshop.id}`}>
                    <Button size="sm" className="w-full h-8 text-xs">View Details</Button>
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
