import { motion } from "framer-motion";
import { Target } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { QuestsPanel } from "@/components/quests/QuestsPanel";

const Quests = () => {
  return (
    <AppLayout>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-xl bg-primary/20 p-3">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quêtes</h1>
            <p className="text-sm text-muted-foreground">
              Complète des quêtes pour gagner des récompenses
            </p>
          </div>
        </div>
      </motion.div>

      {/* Panel des quêtes */}
      <QuestsPanel />
    </AppLayout>
  );
};

export default Quests;
