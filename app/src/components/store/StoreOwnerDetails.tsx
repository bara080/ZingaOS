import { StoreOwner } from '@/lib/types';
import { Avatar } from '../common/Avatar';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { InfoRow } from '../common/InfoRow';
import { Mail, Phone } from 'lucide-react';

export function StoreOwnerDetails({ ownerDeails }: { ownerDeails: StoreOwner }) {
  return (
    <Card className="lg:sticky lg:top-24">
      <CardHeader>
        <CardTitle>Owner</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Avatar src={ownerDeails.avatar} name={ownerDeails.name} size={56} rounded="md" />

          <div className="flex flex-col gap-1">
            <p className="font-semibold">{ownerDeails.name}</p>
            <InfoRow value={ownerDeails.email} icon={<Mail className="w-4 h-4" />} />
            <InfoRow value={ownerDeails.phone} icon={<Phone className="w-4 h-4" />} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
