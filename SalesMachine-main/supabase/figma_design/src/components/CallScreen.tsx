import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Phone, Check, Mail, PhoneOff, X } from 'lucide-react';
import type { Contact, CallResult } from '../App';

type CallScreenProps = {
  contact: Contact;
  contactNumber: number;
  totalContacts: number;
  campaignName: string;
  onSaveAndNext: (result: CallResult) => void;
};

type CallStatus = 'ready' | 'ringing' | 'ongoing' | 'ended';
type Disposition = 'domluveno' | 'poslat-email' | 'nedovolano' | 'nezajem' | null;

export function CallScreen({ contact, contactNumber, totalContacts, campaignName, onSaveAndNext }: CallScreenProps) {
  const [callStatus, setCallStatus] = useState<CallStatus>('ready');
  const [disposition, setDisposition] = useState<Disposition>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setCallStatus('ready');
    setDisposition(null);
    setNotes('');
  }, [contact.id]);

  const handleDial = () => {
    window.location.href = `tel:${contact.phone}`;
    setCallStatus('ringing');
    // Simulace
    setTimeout(() => setCallStatus('ongoing'), 2000);
  };

  const handleEndCall = () => {
    setCallStatus('ended');
  };

  const handleSave = () => {
    onSaveAndNext({
      contactId: contact.id,
      contactName: contact.name,
      contactCompany: contact.company,
      disposition,
      notes
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      {/* Header Info */}
      <div className="flex justify-between items-center text-gray-500 text-sm mb-8 border-b border-gray-200 pb-4">
        <span>{campaignName}</span>
        <span>Kontakt {contactNumber} z {totalContacts}</span>
      </div>

      {/* Contact Big Display */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8 text-center shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{contact.name}</h1>
        <p className="text-xl text-gray-600 mb-6">{contact.company}</p>
        <div className="text-2xl font-mono text-gray-800 bg-gray-50 inline-block px-6 py-2 rounded">
          {contact.phone}
        </div>
        
        <div className="mt-8">
          {callStatus === 'ready' && (
            <Button onClick={handleDial} size="lg" className="w-full max-w-md h-16 text-xl gap-2">
              <Phone className="w-6 h-6" /> Vytočit přes iPhone
            </Button>
          )}
          {(callStatus === 'ringing' || callStatus === 'ongoing') && (
            <div className="flex flex-col items-center gap-4">
              <div className={`text-lg font-medium ${callStatus === 'ringing' ? 'text-blue-600' : 'text-green-600'}`}>
                {callStatus === 'ringing' ? 'Vytáčím...' : 'Hovor probíhá'}
              </div>
              <Button onClick={handleEndCall} variant="destructive" size="lg" className="w-full max-w-md h-14">
                Ukončit hovor
              </Button>
            </div>
          )}
          {callStatus === 'ended' && (
            <div className="text-gray-500 font-medium">Hovor ukončen. Vyberte výsledek.</div>
          )}
        </div>
      </div>

      {/* Result Section (Visible only after call ends or manually enabled) */}
      <div className={`transition-opacity duration-200 ${callStatus === 'ended' ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Button 
            variant={disposition === 'domluveno' ? 'default' : 'outline'}
            className={`h-20 text-lg flex flex-col gap-1 ${disposition === 'domluveno' ? 'bg-green-600 hover:bg-green-700' : ''}`}
            onClick={() => setDisposition('domluveno')}
          >
            <Check className="w-5 h-5" /> Domluveno
          </Button>
          <Button 
            variant={disposition === 'poslat-email' ? 'default' : 'outline'}
            className={`h-20 text-lg flex flex-col gap-1 ${disposition === 'poslat-email' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
            onClick={() => setDisposition('poslat-email')}
          >
            <Mail className="w-5 h-5" /> Poslat e-mail
          </Button>
          <Button 
            variant={disposition === 'nedovolano' ? 'default' : 'outline'}
            className={`h-20 text-lg flex flex-col gap-1 ${disposition === 'nedovolano' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
            onClick={() => setDisposition('nedovolano')}
          >
            <PhoneOff className="w-5 h-5" /> Nedovoláno
          </Button>
          <Button 
            variant={disposition === 'nezajem' ? 'default' : 'outline'}
            className={`h-20 text-lg flex flex-col gap-1 ${disposition === 'nezajem' ? 'bg-gray-600 hover:bg-gray-700' : ''}`}
            onClick={() => setDisposition('nezajem')}
          >
            <X className="w-5 h-5" /> Nezájem
          </Button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Poznámka</label>
          <Textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Zapište výsledek hovoru..."
            className="h-32 text-lg"
          />
        </div>

        <Button 
          onClick={handleSave} 
          disabled={!disposition}
          className="w-full h-16 text-xl font-bold"
        >
          Uložit & další kontakt
        </Button>
      </div>
    </div>
  );
}
