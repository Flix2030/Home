import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Flashcard, SwipeDirection } from '../types';

interface FlashcardViewProps {
  card: Flashcard;
  onSwipe: (direction: SwipeDirection) => void;
  swapSides?: boolean;
}

const FlashcardView: React.FC<FlashcardViewProps> = ({ card, onSwipe, swapSides = false }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  
  // Color overlays
  const rightOpacity = useTransform(x, [0, 150], [0, 0.5]); // Green for Know
  const leftOpacity = useTransform(x, [-150, 0], [0.5, 0]); // Red for Don't Know
  const upOpacity = useTransform(y, [-150, 0], [0.5, 0]); // Yellow for Half-known

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      onSwipe(SwipeDirection.RIGHT);
    } else if (info.offset.x < -threshold) {
      onSwipe(SwipeDirection.LEFT);
    } else if (info.offset.y < -threshold) {
      onSwipe(SwipeDirection.UP);
    } else {
        if (Math.abs(info.offset.x) > 5 || Math.abs(info.offset.y) > 5) {
            setIsFlipped(prev => !prev);
        }
    }
  };

  // Content Logic based on swapSides
  const frontContent = swapSides ? card.definition : card.term;
  const backContent = swapSides ? card.term : card.definition;
  const frontLabel = swapSides ? "Definition" : "Begriff";
  const backLabel = swapSides ? "Begriff" : "Definition";

  return (
    <div className="relative w-full max-w-sm h-96 perspective-1000">
      <motion.div
        className="w-full h-full relative preserve-3d cursor-grab active:cursor-grabbing"
        style={{ x, y, rotate, opacity }}
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        onClick={() => setIsFlipped(!isFlipped)}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
      >
        {/* Front */}
        <div 
          className={`absolute w-full h-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl backface-hidden flex flex-col items-center justify-center p-8 border border-gray-100 dark:border-gray-700 transition-all duration-500 ${isFlipped ? 'rotate-y-180 opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
           <span className="absolute top-4 left-6 text-[10px] uppercase tracking-wider text-gray-400 font-bold">{frontLabel}</span>
           <h3 className="text-3xl font-bold text-gray-800 dark:text-white text-center select-none overflow-y-auto max-h-[60%] w-full no-scrollbar">{frontContent}</h3>
           
           {/* Text "Tippen zum Umdrehen" removed */}
           {/* Swipe hints removed */}
        </div>

        {/* Back */}
        <div 
           className={`absolute w-full h-full bg-blue-50 dark:bg-gray-800 rounded-2xl shadow-xl backface-hidden rotate-y-180 flex flex-col items-center justify-center p-8 border border-blue-100 dark:border-gray-600 transition-all duration-500 ${isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
           <span className="absolute top-4 left-6 text-[10px] uppercase tracking-wider text-blue-400 font-bold">{backLabel}</span>
           <div className="overflow-y-auto no-scrollbar w-full h-full flex flex-col items-center justify-center text-center">
             <p className="text-2xl font-medium text-gray-800 dark:text-gray-200 select-none">{backContent}</p>
             {card.exampleSentence && (
                 <p className="mt-4 text-sm text-gray-500 italic">"{card.exampleSentence}"</p>
             )}
           </div>
        </div>
        
        {/* Swipe Overlays */}
        <motion.div style={{ opacity: rightOpacity }} className="absolute inset-0 bg-green-500 rounded-2xl pointer-events-none z-10 flex items-center justify-center">
            <span className="text-white text-4xl font-bold select-none">GEWUSST</span>
        </motion.div>
        <motion.div style={{ opacity: leftOpacity }} className="absolute inset-0 bg-red-500 rounded-2xl pointer-events-none z-10 flex items-center justify-center">
            <span className="text-white text-4xl font-bold select-none">WIEDERHOLEN</span>
        </motion.div>
        <motion.div style={{ opacity: upOpacity }} className="absolute inset-0 bg-yellow-400 rounded-2xl pointer-events-none z-10 flex items-center justify-center">
            <span className="text-white text-4xl font-bold select-none">TEILWEISE</span>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default FlashcardView;