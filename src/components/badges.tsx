import { AlertTriangle, Clock, Gem } from 'lucide-react';
import { Badge } from './ui';
import { countdownLabel } from '../services/marketplace';
export const UrgencyBadge = () => <Badge className="bg-zs-urgent text-white"><AlertTriangle size={13}/> ACELE</Badge>;
export const PromotionBadge = () => <Badge className="bg-zs-accent text-white"><Gem size={13}/> Öne Çıkan</Badge>;
export const CountdownBadge = ({expiresAt}:{expiresAt:string}) => <Badge className="bg-zs-primary/10 text-zs-primary"><Clock size={13}/> {countdownLabel(expiresAt)}</Badge>;
