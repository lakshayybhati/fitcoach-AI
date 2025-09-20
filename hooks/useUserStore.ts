import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { User, CheckinData, DailyPlan, WeeklyBasePlan, WorkoutPlan, NutritionPlan, RecoveryPlan } from '@/types/user';
import { useAuth } from '@/hooks/useAuth';

interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  mealType: string;
  timestamp: string;
}

interface ExtraFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  timestamp: string;
  confidence?: number;
  notes?: string;
  portionHint?: string;
  imageUri?: string;
}

interface DailyFoodLog {
  date: string;
  entries: FoodEntry[];
  extras: ExtraFood[];
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
}

const USER_STORAGE_KEY = 'fitcoach_user';
const CHECKINS_STORAGE_KEY = 'fitcoach_checkins';
const PLANS_STORAGE_KEY = 'fitcoach_plans';
const BASE_PLANS_STORAGE_KEY = 'fitcoach_base_plans';
const FOOD_LOG_STORAGE_KEY = 'fitcoach_food_log';
const EXTRAS_STORAGE_KEY = 'fitcoach_extras';

export const [UserProvider, useUserStore] = createContextHook(() => {
  const { session, supabase } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [checkins, setCheckins] = useState<CheckinData[]>([]);
  const [plans, setPlans] = useState<DailyPlan[]>([]);
  const [basePlans, setBasePlans] = useState<WeeklyBasePlan[]>([]);
  const [foodLogs, setFoodLogs] = useState<DailyFoodLog[]>([]);
  const [extras, setExtras] = useState<ExtraFood[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserData = useCallback(async () => {
    try {
      const [userData, checkinsData, plansData, basePlansData, foodLogsData, extrasData] = await Promise.all([
        AsyncStorage.getItem(USER_STORAGE_KEY),
        AsyncStorage.getItem(CHECKINS_STORAGE_KEY),
        AsyncStorage.getItem(PLANS_STORAGE_KEY),
        AsyncStorage.getItem(BASE_PLANS_STORAGE_KEY),
        AsyncStorage.getItem(FOOD_LOG_STORAGE_KEY),
        AsyncStorage.getItem(EXTRAS_STORAGE_KEY),
      ]);

      if (userData && userData.trim().startsWith('{') && userData.trim().endsWith('}')) {
        try {
          const parsed = JSON.parse(userData);
          if (parsed && typeof parsed === 'object') {
            // Map legacy "None" to "Non-veg" for backward compatibility
            if (parsed.dietaryPrefs && Array.isArray(parsed.dietaryPrefs)) {
              parsed.dietaryPrefs = parsed.dietaryPrefs.map((p: string) => 
                p === 'None' ? 'Non-veg' : p
              );
            }
            setUser(parsed);
          }
        } catch (e) {
          console.error('Error parsing user data, clearing corrupted data:', e);
          await AsyncStorage.removeItem(USER_STORAGE_KEY);
        }
      } else if (userData) {
        console.warn('Invalid user data format, clearing:', userData.substring(0, 100));
        await AsyncStorage.removeItem(USER_STORAGE_KEY);
      }
      if (checkinsData && checkinsData.trim().startsWith('[') && checkinsData.trim().endsWith(']')) {
        try {
          const parsed = JSON.parse(checkinsData);
          if (Array.isArray(parsed)) {
            setCheckins(parsed);
          }
        } catch (e) {
          console.error('Error parsing checkins data, clearing corrupted data:', e);
          await AsyncStorage.removeItem(CHECKINS_STORAGE_KEY);
        }
      } else if (checkinsData) {
        console.warn('Invalid checkins data format, clearing:', checkinsData.substring(0, 100));
        await AsyncStorage.removeItem(CHECKINS_STORAGE_KEY);
      }
      if (plansData && plansData.trim().startsWith('[') && plansData.trim().endsWith(']')) {
        try {
          const parsed = JSON.parse(plansData);
          if (Array.isArray(parsed)) {
            setPlans(parsed);
          }
        } catch (e) {
          console.error('Error parsing plans data, clearing corrupted data:', e);
          await AsyncStorage.removeItem(PLANS_STORAGE_KEY);
        }
      } else if (plansData) {
        console.warn('Invalid plans data format, clearing:', plansData.substring(0, 100));
        await AsyncStorage.removeItem(PLANS_STORAGE_KEY);
      }
      if (basePlansData && basePlansData.trim().startsWith('[') && basePlansData.trim().endsWith(']')) {
        try {
          const parsed = JSON.parse(basePlansData);
          if (Array.isArray(parsed)) {
            setBasePlans(parsed);
          }
        } catch (e) {
          console.error('Error parsing base plans data, clearing corrupted data:', e);
          await AsyncStorage.removeItem(BASE_PLANS_STORAGE_KEY);
        }
      } else if (basePlansData) {
        console.warn('Invalid base plans data format, clearing:', basePlansData.substring(0, 100));
        await AsyncStorage.removeItem(BASE_PLANS_STORAGE_KEY);
      }
      if (foodLogsData && foodLogsData.trim().startsWith('[') && foodLogsData.trim().endsWith(']')) {
        try {
          const parsed = JSON.parse(foodLogsData);
          if (Array.isArray(parsed)) {
            // Migrate old food logs to include extras array
            const migratedLogs = parsed.map(log => ({
              ...log,
              extras: log.extras || []
            }));
            setFoodLogs(migratedLogs);
          }
        } catch (e) {
          console.error('Error parsing food logs data, clearing corrupted data:', e);
          await AsyncStorage.removeItem(FOOD_LOG_STORAGE_KEY);
        }
      } else if (foodLogsData) {
        console.warn('Invalid food logs data format, clearing:', foodLogsData.substring(0, 100));
        await AsyncStorage.removeItem(FOOD_LOG_STORAGE_KEY);
      }
      if (extrasData && extrasData.trim().startsWith('[') && extrasData.trim().endsWith(']')) {
        try {
          const parsed = JSON.parse(extrasData);
          if (Array.isArray(parsed)) {
            setExtras(parsed);
          }
        } catch (e) {
          console.error('Error parsing extras data, clearing corrupted data:', e);
          await AsyncStorage.removeItem(EXTRAS_STORAGE_KEY);
        }
      } else if (extrasData) {
        console.warn('Invalid extras data format, clearing:', extrasData.substring(0, 100));
        await AsyncStorage.removeItem(EXTRAS_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const updateUser = useCallback(async (userData: User) => {
    if (!userData?.id) return;
    try {
      setUser(userData);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  }, []);

  const addCheckin = useCallback(async (checkin: CheckinData) => {
    try {
      const updatedCheckins = [...checkins, checkin];
      setCheckins(updatedCheckins);
      await AsyncStorage.setItem(CHECKINS_STORAGE_KEY, JSON.stringify(updatedCheckins));
    } catch (error) {
      console.error('Error saving checkin:', error);
    }
  }, [checkins]);

  const addPlan = useCallback(async (plan: DailyPlan) => {
    try {
      const updatedPlans = [...plans, plan];
      setPlans(updatedPlans);
      await AsyncStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(updatedPlans));
    } catch (error) {
      console.error('Error saving plan:', error);
    }
  }, [plans]);

  const addBasePlan = useCallback(async (basePlan: WeeklyBasePlan) => {
    try {
      const updatedBasePlans = [...basePlans, basePlan];
      setBasePlans(updatedBasePlans);
      await AsyncStorage.setItem(BASE_PLANS_STORAGE_KEY, JSON.stringify(updatedBasePlans));
    } catch (error) {
      console.error('Error saving base plan:', error);
    }
  }, [basePlans]);

  const getCurrentBasePlan = useCallback(() => {
    return basePlans.find(plan => !plan.isLocked) || basePlans[basePlans.length - 1];
  }, [basePlans]);

  const updateBasePlanDay = useCallback(async (dayKey: string, dayData: { workout: WorkoutPlan; nutrition: NutritionPlan; recovery: RecoveryPlan }) => {
    try {
      const currentBasePlan = getCurrentBasePlan();
      if (!currentBasePlan) {
        console.error('No current base plan found');
        return false;
      }

      // Create updated base plan with the modified day
      const updatedBasePlan = {
        ...currentBasePlan,
        days: {
          ...currentBasePlan.days,
          [dayKey]: dayData
        }
      };

      // Update the base plans array
      const updatedBasePlans = basePlans.map(plan => 
        plan.id === currentBasePlan.id ? updatedBasePlan : plan
      );

      setBasePlans(updatedBasePlans);
      await AsyncStorage.setItem(BASE_PLANS_STORAGE_KEY, JSON.stringify(updatedBasePlans));
      
      console.log(`Successfully updated ${dayKey} in base plan`);
      return true;
    } catch (error) {
      console.error('Error updating base plan day:', error);
      return false;
    }
  }, [basePlans, getCurrentBasePlan]);

  const getRecentCheckins = useCallback((days: number = 15) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return checkins.filter(checkin => 
      new Date(checkin.date) >= cutoffDate
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [checkins]);

  const getTodayCheckin = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return checkins.find(checkin => checkin.date === today);
  }, [checkins]);

  const getTodayPlan = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return plans.find(plan => plan.date === today);
  }, [plans]);

  const getStreak = useCallback(() => {
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const hasCheckin = checkins.some(checkin => checkin.date === dateStr);
      if (hasCheckin) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    return streak;
  }, [checkins]);

  const getWeightData = useCallback(() => {
    return checkins
      .filter(checkin => checkin.currentWeight !== undefined)
      .map(checkin => ({
        date: checkin.date,
        weight: checkin.currentWeight!,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [checkins]);

  const getLatestWeight = useCallback(() => {
    const weightData = getWeightData();
    return weightData.length > 0 ? weightData[weightData.length - 1].weight : null;
  }, [getWeightData]);

  const getWeightProgress = useCallback(() => {
    if (!user?.goalWeight) return null;
    
    const latestWeight = getLatestWeight();
    if (!latestWeight) return null;
    
    const remaining = Math.abs(latestWeight - user.goalWeight);
    const isGaining = user.goalWeight > latestWeight;
    
    return {
      current: latestWeight,
      goal: user.goalWeight,
      remaining,
      isGaining,
      progress: user.weight ? Math.abs((user.weight - latestWeight) / (user.weight - user.goalWeight)) * 100 : 0
    };
  }, [user, getLatestWeight]);

  const getTodayFoodLog = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return foodLogs.find(log => log.date === today);
  }, [foodLogs]);

  const addFoodEntry = useCallback(async (entry: Omit<FoodEntry, 'id' | 'timestamp'>) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const newEntry: FoodEntry = {
        ...entry,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
      };

      const existingLogIndex = foodLogs.findIndex(log => log.date === today);
      let updatedFoodLogs: DailyFoodLog[];

      if (existingLogIndex >= 0) {
        // Update existing log
        const existingLog = foodLogs[existingLogIndex];
        const updatedEntries = [...existingLog.entries, newEntry];
        const updatedLog: DailyFoodLog = {
          date: today,
          entries: updatedEntries,
          extras: existingLog.extras || [],
          totalCalories: updatedEntries.reduce((sum, e) => sum + e.calories, 0) + (existingLog.extras || []).reduce((sum, e) => sum + e.calories, 0),
          totalProtein: updatedEntries.reduce((sum, e) => sum + e.protein, 0) + (existingLog.extras || []).reduce((sum, e) => sum + e.protein, 0),
          totalFat: updatedEntries.reduce((sum, e) => sum + e.fat, 0) + (existingLog.extras || []).reduce((sum, e) => sum + e.fat, 0),
          totalCarbs: updatedEntries.reduce((sum, e) => sum + e.carbs, 0) + (existingLog.extras || []).reduce((sum, e) => sum + e.carbs, 0),
        };
        
        updatedFoodLogs = [...foodLogs];
        updatedFoodLogs[existingLogIndex] = updatedLog;
      } else {
        // Create new log
        const newLog: DailyFoodLog = {
          date: today,
          entries: [newEntry],
          extras: [],
          totalCalories: newEntry.calories,
          totalProtein: newEntry.protein,
          totalFat: newEntry.fat,
          totalCarbs: newEntry.carbs,
        };
        updatedFoodLogs = [...foodLogs, newLog];
      }

      setFoodLogs(updatedFoodLogs);
      await AsyncStorage.setItem(FOOD_LOG_STORAGE_KEY, JSON.stringify(updatedFoodLogs));
      
      console.log('Food entry added successfully');
      return true;
    } catch (error) {
      console.error('Error adding food entry:', error);
      return false;
    }
  }, [foodLogs]);

  const addExtraFood = useCallback(async (extraFood: Omit<ExtraFood, 'id' | 'timestamp'>) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const nowIso = new Date().toISOString();
      const newExtra: ExtraFood = {
        ...extraFood,
        id: Date.now().toString(),
        timestamp: nowIso,
      };

      if (session?.user?.id) {
        try {
          console.log('[Supabase] Inserting into food_extras');
          let nutritionPlanId: string | null = null;
          try {
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_todays_nutrition_plan', { user_uuid: session.user.id });
            if (rpcError) {
              console.warn('[Supabase] get_todays_nutrition_plan error', rpcError);
            } else if (rpcData) {
              nutritionPlanId = rpcData as string;
            }
          } catch (e) {
            console.warn('[Supabase] RPC exception', e);
          }

          const insertPayload = {
            user_id: session.user.id,
            nutrition_plan_id: nutritionPlanId,
            date: nowIso,
            name: newExtra.name,
            calories: Math.round(newExtra.calories),
            protein: Number(newExtra.protein),
            carbs: Number(newExtra.carbs),
            fat: Number(newExtra.fat),
            portion: newExtra.portionHint ?? null,
            image_url: newExtra.imageUri ?? null,
            confidence: newExtra.confidence ?? null,
            notes: newExtra.notes ?? null,
          } as const;

          const { error: insertError } = await supabase.from('food_extras').insert(insertPayload);
          if (insertError) {
            console.error('[Supabase] Insert food_extras failed', insertError);
          } else {
            console.log('[Supabase] Inserted food_extras successfully');
          }
        } catch (e) {
          console.error('[Supabase] addExtraFood remote sync failed', e);
        }
      } else {
        console.log('[Supabase] No session, storing locally only');
      }

      const existingLogIndex = foodLogs.findIndex(log => log.date === today);
      let updatedFoodLogs: DailyFoodLog[];

      if (existingLogIndex >= 0) {
        const existingLog = foodLogs[existingLogIndex];
        const updatedExtras = [...(existingLog.extras || []), newExtra];
        const updatedLog: DailyFoodLog = {
          ...existingLog,
          extras: updatedExtras,
          totalCalories: existingLog.entries.reduce((sum, e) => sum + e.calories, 0) + updatedExtras.reduce((sum, e) => sum + e.calories, 0),
          totalProtein: existingLog.entries.reduce((sum, e) => sum + e.protein, 0) + updatedExtras.reduce((sum, e) => sum + e.protein, 0),
          totalFat: existingLog.entries.reduce((sum, e) => sum + e.fat, 0) + updatedExtras.reduce((sum, e) => sum + e.fat, 0),
          totalCarbs: existingLog.entries.reduce((sum, e) => sum + e.carbs, 0) + updatedExtras.reduce((sum, e) => sum + e.carbs, 0),
        };
        
        updatedFoodLogs = [...foodLogs];
        updatedFoodLogs[existingLogIndex] = updatedLog;
      } else {
        const newLog: DailyFoodLog = {
          date: today,
          entries: [],
          extras: [newExtra],
          totalCalories: newExtra.calories,
          totalProtein: newExtra.protein,
          totalFat: newExtra.fat,
          totalCarbs: newExtra.carbs,
        };
        updatedFoodLogs = [...foodLogs, newLog];
      }

      setFoodLogs(updatedFoodLogs);
      await AsyncStorage.setItem(FOOD_LOG_STORAGE_KEY, JSON.stringify(updatedFoodLogs));
      
      console.log('Extra food added successfully');
      return true;
    } catch (error) {
      console.error('Error adding extra food:', error);
      return false;
    }
  }, [foodLogs, session?.user?.id, supabase]);

  const getTodayExtras = useCallback(() => {
    const todayLog = getTodayFoodLog();
    return todayLog?.extras || [];
  }, [getTodayFoodLog]);

  const getNutritionProgress = useCallback(() => {
    const todayPlan = getTodayPlan();
    const todayFoodLog = getTodayFoodLog();
    
    if (!todayPlan?.nutrition || !todayFoodLog) {
      return {
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
      };
    }

    const targetCalories = todayPlan.nutrition.total_kcal || 2000;
    const targetProtein = todayPlan.nutrition.protein_g || 150;
    const targetFat = Math.round((targetCalories * 0.25) / 9);
    const targetCarbs = Math.round((targetCalories - (targetProtein * 4) - (targetFat * 9)) / 4);

    return {
      calories: Math.min(todayFoodLog.totalCalories / targetCalories, 1),
      protein: Math.min(todayFoodLog.totalProtein / targetProtein, 1),
      fat: Math.min(todayFoodLog.totalFat / targetFat, 1),
      carbs: Math.min(todayFoodLog.totalCarbs / targetCarbs, 1),
    };
  }, [getTodayPlan, getTodayFoodLog]);

  const clearAllData = useCallback(async () => {
    try {
      console.log('Starting data clear process...');
      
      // Reset state first
      setUser(null);
      setCheckins([]);
      setPlans([]);
      setBasePlans([]);
      setFoodLogs([]);
      setExtras([]);
      
      // Then clear AsyncStorage
      await Promise.all([
        AsyncStorage.removeItem(USER_STORAGE_KEY),
        AsyncStorage.removeItem(CHECKINS_STORAGE_KEY),
        AsyncStorage.removeItem(PLANS_STORAGE_KEY),
        AsyncStorage.removeItem(BASE_PLANS_STORAGE_KEY),
        AsyncStorage.removeItem(FOOD_LOG_STORAGE_KEY),
        AsyncStorage.removeItem(EXTRAS_STORAGE_KEY),
      ]);
      
      console.log('All data cleared successfully');
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }, []);

  const value = useMemo(() => ({
    user,
    checkins,
    plans,
    basePlans,
    foodLogs,
    extras,
    isLoading,
    updateUser,
    addCheckin,
    addPlan,
    addBasePlan,
    updateBasePlanDay,
    getCurrentBasePlan,
    getRecentCheckins,
    getTodayCheckin,
    getTodayPlan,
    getTodayFoodLog,
    getTodayExtras,
    addFoodEntry,
    addExtraFood,
    getNutritionProgress,
    getStreak,
    getWeightData,
    getLatestWeight,
    getWeightProgress,
    clearAllData,
  }), [user, checkins, plans, basePlans, foodLogs, extras, isLoading, updateUser, addCheckin, addPlan, addBasePlan, updateBasePlanDay, getCurrentBasePlan, getRecentCheckins, getTodayCheckin, getTodayPlan, getTodayFoodLog, getTodayExtras, addFoodEntry, addExtraFood, getNutritionProgress, getStreak, getWeightData, getLatestWeight, getWeightProgress, clearAllData]);

  return value;
});