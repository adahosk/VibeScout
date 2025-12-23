
import React from 'react';
import { PlaceSuggestion, VibeType } from '../types';

interface PlaceCardProps {
  place: PlaceSuggestion;
}

const PlaceCard: React.FC<PlaceCardProps> = ({ place }) => {
  const getVibeColor = (vibe: VibeType) => {
    switch (vibe) {
      case VibeType.ROMANTIC: return 'bg-rose-100 text-rose-700 border-rose-200';
      case VibeType.QUIET: return 'bg-sky-100 text-sky-700 border-sky-200';
      case VibeType.PARTY: return 'bg-amber-100 text-amber-700 border-amber-200';
      case VibeType.CASUAL: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case VibeType.FANCY: return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow group">
      <div className="p-4 flex-1">
        <div className="flex justify-between items-start mb-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getVibeColor(place.vibe)}`}>
            {place.vibe}
          </span>
          <span className="text-sm font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
            {place.distance}
          </span>
        </div>
        
        <h3 className="text-lg font-bold text-slate-800 leading-tight mb-1">{place.name}</h3>
        <p className="text-xs text-slate-500 line-clamp-1 mb-3">{place.address}</p>
        
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center">
            <span className="text-sm font-bold text-slate-700">{place.rating}</span>
            <svg className="w-4 h-4 text-yellow-400 ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <div className="text-sm text-slate-500 font-medium">{place.priceLevel}</div>
          <div className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-600 uppercase font-bold tracking-wider">
            {place.noiseLevel} Noise
          </div>
        </div>
        
        <p className="text-sm text-slate-600 italic leading-relaxed">
          &ldquo;{place.summary}&rdquo;
        </p>
      </div>
      
      <div className="p-4 pt-0">
        <div className="h-[1px] bg-slate-100 mb-4"></div>
        <div className="flex justify-between items-center">
          <div className="text-xs font-semibold text-slate-400 uppercase">Best for</div>
          <div className="text-sm font-medium text-slate-700">{place.bestFor}</div>
        </div>
        <a 
          href={place.mapsUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="mt-4 block text-center py-2 bg-slate-900 text-white rounded-xl font-medium text-sm hover:bg-slate-800 transition-colors"
        >
          View on Maps
        </a>
      </div>
    </div>
  );
};

export default PlaceCard;
