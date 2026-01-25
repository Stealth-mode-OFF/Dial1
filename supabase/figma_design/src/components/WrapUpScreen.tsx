import { useEffect } from 'react';
import { Button } from './ui/button';
import { ArrowRight, Square } from 'lucide-react';
import type { CallResult } from '../App';

type WrapUpScreenProps = {
  result: CallResult;
  onNextCall: () => void;
  onEndCampaign: () => void;
  hasMoreContacts: boolean;
};

export function WrapUpScreen({ result, onNextCall, onEndCampaign, hasMoreContacts }: WrapUpScreenProps) {
  
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && hasMoreContacts) {
        onNextCall();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [hasMoreContacts, onNextCall]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-lg w-full p-8 text-center">
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Hovor uložen</h2>
          
          <div className="py-6 border-t border-b border-gray-100 my-6">
            <p className="text-lg font-medium text-gray-900">{result.contactName}</p>
            <p className="text-gray-500">{result.contactCompany}</p>
            <div className="mt-4 inline-block px-4 py-1 rounded-full bg-gray-100 text-gray-800 font-medium capitalize">
              {result.disposition?.replace('-', ' ')}
            </div>
          </div>
          
          {result.notes && (
            <p className="text-gray-600 italic bg-gray-50 p-4 rounded">"{result.notes}"</p>
          )}
        </div>

        <div className="space-y-3">
          {hasMoreContacts ? (
            <Button onClick={onNextCall} className="w-full h-14 text-lg gap-2">
              Další hovor <ArrowRight className="w-5 h-5" />
            </Button>
          ) : (
            <div className="p-4 bg-green-100 text-green-800 rounded font-medium">
              Kampaň dokončena
            </div>
          )}

          <Button variant="outline" onClick={onEndCampaign} className="w-full h-12 text-gray-600">
            <Square className="w-4 h-4 mr-2" />
            Zpět na seznam
          </Button>
        </div>
        
        {hasMoreContacts && (
          <p className="mt-4 text-sm text-gray-400">Tip: Stiskněte ENTER pro pokračování</p>
        )}
      </div>
    </div>
  );
}
