import { useScores } from "@/hooks/use-scores";
import { Trophy, Medal, User } from "lucide-react";
import { motion } from "framer-motion";

export function Leaderboard() {
  const { data: scores, isLoading } = useScores();

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sortedScores = [...(scores || [])].sort((a, b) => b.score - a.score).slice(0, 10);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="w-6 h-6 text-yellow-500" />
        <h2 className="text-2xl font-bold text-primary">Hall of Fame</h2>
      </div>

      <div className="space-y-3">
        {sortedScores.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`
              flex items-center justify-between p-3 rounded-lg border-2
              ${index === 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-border/40'}
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full font-bold font-display
                ${index === 0 ? 'bg-yellow-400 text-white' : 
                  index === 1 ? 'bg-gray-300 text-white' : 
                  index === 2 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-500'}
              `}>
                {index + 1}
              </div>
              <span className="font-semibold text-foreground/80">{entry.username}</span>
            </div>
            <span className="font-mono font-bold text-primary">{entry.score}m</span>
          </motion.div>
        ))}

        {sortedScores.length === 0 && (
          <div className="text-center py-8 text-muted-foreground italic">
            No legends yet. Be the first!
          </div>
        )}
      </div>
    </div>
  );
}
