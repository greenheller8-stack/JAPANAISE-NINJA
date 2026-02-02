import { storage } from "./storage";

export async function seedDatabase() {
  const existingScores = await storage.getScores();
  
  if (existingScores.length === 0) {
    console.log("Seeding database with initial scores...");
    
    await storage.createScore({ username: "NinjaMax", score: 1250 });
    await storage.createScore({ username: "ShadowRun", score: 980 });
    await storage.createScore({ username: "BladeKai", score: 875 });
    await storage.createScore({ username: "StormFury", score: 720 });
    await storage.createScore({ username: "SilentWind", score: 650 });
    
    console.log("Seeding complete.");
  } else {
    console.log("Database already seeded.");
  }
}
