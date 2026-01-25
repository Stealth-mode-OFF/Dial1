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
    <div className="max-w-4xl mx-auto py-4 sm:py-8 px-4 sm:px-6 min-h-screen flex flex-col">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-gray-500 text-xs sm:text-sm mb-4 sm:mb-8 border-b border-gray-200 pb-4 gap-1">
        <span className="truncate">{campaignName}</span>
        <span className="text-gray-400 whitespace-nowrap">Kontakt {contactNumber}/{totalContacts}</span>
      </div>

      {/* Contact Big Display */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-8 mb-6 sm:mb-8 text-center shadow-sm flex-shrink-0">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1 sm:mb-2 break-words">{contact.name}</h1>
        <p className="text-lg sm:text-xl text-gray-600 mb-4 sm:mb-6 break-words">{contact.company}</p>
        <div className="text-lg sm:text-2xl font-mono text-gray-800 bg-gray-50 inline-block px-3 sm:px-6 py-1 sm:py-2 rounded break-all">
          {contact.phone}
        </div>
        
        <div className="mt-6 sm:mt-8">
          {callStatus === 'ready' && (
            <Button onClick={handleDial} size="lg" className="w-full h-14 sm:h-16 text-base sm:text-xl gap-2">
              <Phone className="w-5 h-5" /> 
              <span className="hidden sm:inline">Vytočit přes iPhone</span>
              <span className="sm:hidden">Vytočit</span>
            </Button>
          )}
          {(callStatus === 'ringing' || callStatus === 'ongoing') && (
            <div className="flex flex-col items-center gap-4">
              <div className={`text-base sm:text-lg font-medium ${callStatus === 'ringing' ? 'text-blue-600' : 'text-green-600'}`}>
                {callStatus === 'ringing' ? 'Vytáčím...' : 'Hovor probíhá'}
              </div>
              <Button onClick={handleEndCall} variant="destructive" size="lg" className="w-full h-12 sm:h-14">
                Ukončit hovor
              </Button>
            </div>
          )}
          {callStatus === 'ended' && (
            <div className="text-gray-500 font-medium text-sm sm:text-base">Hovor ukončen. Vyberte výsledek.</div>
          )}
        </div>
      </div>

      {/* Result Section (Visible only after call ends or manually enabled) */}
      <div className={`transition-opacity duration-200 mt-6 sm:mt-8 flex-1 ${callStatus === 'ended' ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <Button 
            variant={disposition === 'domluveno' ? 'default' : 'outline'}
            className={`h-14 sm:h-20 text-xs sm:text-base sm:text-lg flex flex-col gap-1 ${disposition === 'domluveno' ? 'bg-green-600 hover:bg-green-700' : ''}`}
            onClick={() => setDisposition('domluveno')}
          >
            <Check className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden sm:inline">Domluveno</span><span className="sm:hidden">OK</span>
          </Button>
          <Button 
            variant={disposition === 'poslat-email' ? 'default' : 'outline'}
            className={`h-14 sm:h-20 text-xs sm:text-base sm:text-lg flex flex-col gap-1 ${disposition === 'poslat-email' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
            onClick={() => setDisposition('poslat-email')}
          >
            <Mail className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden sm:inline">Poslat e-mail</span><span className="sm:hidden">Email</span>
          </Button>
          <Button 
            variant={disposition === 'nedovolano' ? 'default' : 'outline'}
            className={`h-14 sm:h-20 text-xs sm:text-base sm:text-lg flex flex-col gap-1 ${disposition === 'nedovolano' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
            onClick={() => setDisposition('nedovolano')}
          >
            <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden sm:inline">Nedovoláno</span><span className="sm:hidden">Chyba</span>
          </Button>
          <Button 
            variant={disposition === 'nezajem' ? 'default' : 'outline'}
            className={`h-14 sm:h-20 text-xs sm:text-base sm:text-lg flex flex-col gap-1 ${disposition === 'nezajem' ? 'bg-gray-600 hover:bg-gray-700' : ''}`}
            onClick={() => setDisposition('nezajem')}
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden sm:inline">Nezájem</span><span className="sm:hidden">Ne</span>
          </Button>
        </div>

        <div className="mb-4 sm:mb-6">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Poznámka</label>
          <Textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Zapište výsledek hovoru..."
            className="h-24 sm:h-32 text-sm sm:text-lg"
          />
        </div>

        <Button 
          onClick={handleSave} 
          disabled={!disposition}
          className="w-full h-12 sm:h-16 text-base sm:text-xl font-bold"
        >
          Uložit & další
        </Button>
      </div>
    </div>
  );
}
