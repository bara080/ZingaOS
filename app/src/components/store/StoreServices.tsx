import { StoreService } from '@/lib/types';
import { ServiceCard } from '../services/ServiceCard';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const StoreServices = ({ services }: { services: StoreService[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Services</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {services.map((service) => (
            <ServiceCard key={service._id} service={service} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
export default StoreServices;
