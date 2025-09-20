import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Animated } from 'react-native';
import { router, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '@/hooks/useUserStore';
import type { DailyPlan, User, CheckinData } from '@/types/user';

const generateAdjustedDailyPlan = async (user: User, todayCheckin: CheckinData, recentCheckins: CheckinData[], basePlan: any) => {
  if (!user || !todayCheckin) {
    throw new Error('Invalid user or checkin data');
  }

  // Calculate target calories based on user's TDEE or defaults
  const targetCalories = user.dailyCalorieTarget || 
    (user.goal === 'WEIGHT_LOSS' ? 1800 : user.goal === 'MUSCLE_GAIN' ? 2400 : 2000);
  
  // Calculate protein target (0.8-1g per lb of body weight or 30% of calories)
  const proteinTarget = user.weight 
    ? Math.round(user.weight * 2.2 * 0.9) // 0.9g per lb
    : Math.round(targetCalories * 0.3 / 4); // 30% of calories from protein

  // Build user profile string with all relevant data
  const userProfile = [
    `Goal: ${user.goal}`,
    `Equipment: ${user.equipment.join(', ')}`,
    `Diet: ${user.dietaryPrefs.join(', ')}`,
    user.dietaryNotes ? `Food preferences: ${user.dietaryNotes}` : '',
    user.age ? `Age: ${user.age}` : '',
    user.sex ? `Sex: ${user.sex}` : '',
    user.weight ? `Weight: ${user.weight}kg` : '',
    user.height ? `Height: ${user.height}cm` : '',
    user.activityLevel ? `Activity: ${user.activityLevel}` : '',
    `Training days/week: ${user.trainingDays}`,
    user.supplements?.length ? `Supplements: ${user.supplements.join(', ')}` : '',
    user.personalGoals?.length ? `Personal goals: ${user.personalGoals.join(', ')}` : '',
    user.perceivedLacks?.length ? `Areas to improve: ${user.perceivedLacks.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  // Analyze recent training patterns
  const recentSoreness = recentCheckins
    .slice(0, 3)
    .flatMap(c => c.soreness || [])
    .filter((v, i, a) => a.indexOf(v) === i);

  // Get today's day of week for base plan
  const today = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayKey = dayNames[today.getDay()];
  const todayBasePlan = basePlan?.days?.[todayKey];

  if (!todayBasePlan) {
    throw new Error('No base plan found for today');
  }

  // Daily adjustment system prompt
  const systemPrompt = `You are a Daily Titration Specialist. Your job is to take a BASE PLAN and make small, data-driven adjustments based on today's check-in data. DO NOT rebuild the plan - only adjust what's necessary.

${userProfile}

BASE PLAN FOR TODAY (${todayKey.toUpperCase()}):
Workout: ${JSON.stringify(todayBasePlan.workout)}
Nutrition: ${JSON.stringify(todayBasePlan.nutrition)}
Recovery: ${JSON.stringify(todayBasePlan.recovery)}

TODAY'S CHECK-IN STATE:
- Energy: ${todayCheckin.energy}/10
- Stress: ${todayCheckin.stress}/10
- Sleep: ${todayCheckin.sleepHrs}h (${todayCheckin.wokeFeeling})
- Soreness: ${todayCheckin.soreness?.join(', ') || 'None'}
- Mood: ${todayCheckin.moodCharacter}
- Motivation: ${todayCheckin.motivation}/10
- Recent soreness pattern: ${recentSoreness.join(', ') || 'None'}

ADJUSTMENT RULES:
- Low HRV/poor sleep/high stress: -20-30% volume, cap intensity at RIR≥2, emphasize mobility
- Soreness/injury: auto-swap or skip affected patterns, redistribute volume
- Travel/busy: switch to 20-30min bodyweight/DB circuits
- Energy low/digestion heavy: reduce dense carbs pre-workout, lighter morning meals
- Great recovery: allow +1 set on primaries or slightly tighter RIR
- Diet adherence low: keep same meals but adjust portions

Return ONLY this JSON structure with your adjustments:
{"workout":{"focus":["Adjusted focus"],"blocks":[{"name":"Block","items":[{"exercise":"Name","sets":3,"reps":"8-12","RIR":2}]}],"notes":"Adjustment note"},"nutrition":{"total_kcal":${targetCalories},"protein_g":${proteinTarget},"meals":[{"name":"Meal","items":[{"food":"Item","qty":"Amount"}]}],"hydration_l":2.5},"recovery":{"mobility":["Tip"],"sleep":["Tip"]},"motivation":"Adjusted message","adjustments":["List of changes made"]}`;

  const requestBody = {
    messages: [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      {
        role: 'user' as const,
        content: `Generate my personalized daily fitness plan for ${new Date().toLocaleDateString()}. Consider my current state and adapt the plan accordingly.`
      }
    ]
  };

  console.log('🤖 Generating personalized plan with AI...');
  console.log('📊 User Profile:');
  console.log('  - Goal:', user.goal);
  console.log('  - Energy:', todayCheckin.energy, '/ Motivation:', todayCheckin.motivation);
  console.log('  - Soreness:', todayCheckin.soreness?.join(', ') || 'None');
  console.log('  - Target Calories:', targetCalories, 'kcal');
  console.log('  - Target Protein:', proteinTarget, 'g');
  if (user.personalGoals?.length) {
    console.log('  - Personal Goals:', user.personalGoals.join(', '));
  }

  try {
    const response = await fetch('https://toolkit.rork.com/text/llm/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Gemini API Response received');
    
    if (!data.completion) {
      throw new Error('No completion in API response');
    }

    // Clean and parse the response with improved error handling
    let cleanedResponse = data.completion.trim();
    console.log('Raw AI response length:', cleanedResponse.length);
    console.log('Raw AI response preview:', cleanedResponse.substring(0, 200));
    
    // Remove markdown code blocks if present
    cleanedResponse = cleanedResponse.replace(/```json\s*\n?|```\s*\n?/g, '');
    cleanedResponse = cleanedResponse.replace(/```\s*$/g, '');
    cleanedResponse = cleanedResponse.replace(/^```\s*/, '');
    
    // Remove any leading/trailing non-JSON content more aggressively
    cleanedResponse = cleanedResponse.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
    
    // Find JSON object in the response
    const jsonStart = cleanedResponse.indexOf('{');
    let jsonEnd = -1;
    
    // Find the matching closing brace
    if (jsonStart !== -1) {
      let braceCount = 0;
      for (let i = jsonStart; i < cleanedResponse.length; i++) {
        if (cleanedResponse[i] === '{') braceCount++;
        if (cleanedResponse[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            jsonEnd = i + 1;
            break;
          }
        }
      }
    }
    
    // If JSON is incomplete, try to recover by finding the last complete section
    if (jsonStart === -1 || jsonEnd === -1) {
      console.log('❌ Failed to find JSON boundaries');
      console.log('Response preview:', cleanedResponse.substring(0, 500));
      throw new Error('Failed to parse AI response: No valid JSON found');
    }
    
    let jsonString = cleanedResponse.substring(jsonStart, jsonEnd);
    console.log('Extracted JSON string length:', jsonString.length);
    console.log('JSON preview:', jsonString.substring(0, 200));
    
    // Check if JSON appears to be truncated
    if (jsonString.length < 500 || !jsonString.includes('"motivation"')) {
      console.log('❌ JSON appears truncated, length:', jsonString.length);
      throw new Error('AI response appears to be truncated');
    }
    
    // Fix common JSON issues more comprehensively
    jsonString = jsonString.replace(/"RIR":\s*"?(\d+)-(\d+)"?/g, '"RIR": $1');
    jsonString = jsonString.replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas
    jsonString = jsonString.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":'); // Quote unquoted keys
    jsonString = jsonString.replace(/""([^"]+)"":/g, '"$1":'); // Fix double quotes
    jsonString = jsonString.replace(/'/g, '"'); // Replace single quotes with double quotes
    jsonString = jsonString.replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
    jsonString = jsonString.replace(/\n/g, ' '); // Replace newlines with spaces
    jsonString = jsonString.replace(/\s+/g, ' '); // Normalize whitespace
    
    let parsedPlan;
    try {
      // Additional validation before parsing
      if (!jsonString || jsonString.length < 50) {
        throw new Error('JSON string too short or empty');
      }
      
      // Check if it looks like valid JSON
      if (!jsonString.trim().startsWith('{') || !jsonString.trim().endsWith('}')) {
        throw new Error('JSON string does not have proper object structure');
      }
      
      // Try to parse with better error context
      parsedPlan = JSON.parse(jsonString);
      console.log('✅ Successfully parsed JSON');
    } catch (jsonError) {
      console.error('❌ JSON parsing failed:', jsonError);
      console.error('Problematic JSON string (first 1000 chars):', jsonString.substring(0, 1000));
      console.error('JSON string length:', jsonString.length);
      
      // Try to identify the specific character causing issues
      if (jsonError instanceof Error && jsonError.message.includes('Unexpected')) {
        const match = jsonError.message.match(/position (\d+)/);
        if (match) {
          const pos = parseInt(match[1]);
          console.error('Error at position:', pos);
          console.error('Context around error:', jsonString.substring(Math.max(0, pos - 20), pos + 20));
        }
      }
      
      throw new Error(`Invalid JSON format in AI response: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`);
    }
    
    // Validate the structure
    if (!parsedPlan || typeof parsedPlan !== 'object') {
      throw new Error('AI response is not a valid object');
    }
    
    if (!parsedPlan.workout || !parsedPlan.nutrition || !parsedPlan.recovery) {
      throw new Error('Invalid plan structure received from AI');
    }
    
    console.log('🎯 Plan generated successfully');
    console.log('Workout focus:', parsedPlan.workout?.focus || 'N/A');
    console.log('Total calories:', parsedPlan.nutrition?.total_kcal || 'N/A');
    console.log('Protein:', parsedPlan.nutrition?.protein_g || 'N/A');
    
    return parsedPlan;
    
  } catch (parseError) {
    console.error('❌ Error parsing AI response:', parseError);
    throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
  }
};

const LOADING_MESSAGES = [
  "Analyzing your check-in data...",
  "Reviewing your fitness history...",
  "Crafting your perfect workout...",
  "Optimizing your nutrition plan...",
  "Adding recovery recommendations...",
  "Finalizing your daily plan...",
];

export default function GeneratingPlanScreen() {
  const { user, getRecentCheckins, getTodayCheckin, addPlan, getCurrentBasePlan } = useUserStore();
  const [messageIndex, setMessageIndex] = useState(0);
  const [, setIsGenerating] = useState(true);
  const fadeAnim = useMemo(() => new Animated.Value(1), []);

  const generatePlan = useCallback(async () => {
    try {
      const todayCheckin = getTodayCheckin();
      const recentCheckins = getRecentCheckins(15);

      if (!todayCheckin || !user) {
        throw new Error('Missing checkin or user data');
      }

      // Get current base plan
      const basePlan = getCurrentBasePlan();
      
      if (!basePlan) {
        throw new Error('No base plan available. Please complete onboarding first.');
      }

      const planData = await generateAdjustedDailyPlan(user, todayCheckin, recentCheckins, basePlan);
      
      const plan: DailyPlan = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        ...planData,
        adherence: 0,
        adjustments: planData.adjustments || [],
        isFromBasePlan: true,
      };

      await addPlan(plan);
      
      setTimeout(() => {
        setIsGenerating(false);
        router.replace('/plan');
      }, 1000);

    } catch (error) {
      console.error('Error generating plan:', error);
      
      // Generate adaptive fallback plan based on user data
      const adaptiveFallbackPlan = (user: User, checkin: CheckinData): DailyPlan => {
        const isLowEnergy = (checkin.energy || 5) < 5;
        const hasEquipment = user.equipment.some(eq => eq !== 'Bodyweight');
        const isCutting = user.goal === 'WEIGHT_LOSS';
        const targetCals = user.dailyCalorieTarget || (isCutting ? 1800 : user.goal === 'MUSCLE_GAIN' ? 2400 : 2000);
        const targetProtein = user.weight ? Math.round(user.weight * 2.2 * 0.9) : Math.round(targetCals * 0.3 / 4);
        
        return {
          id: Date.now().toString(),
          date: new Date().toISOString().split('T')[0],
          workout: {
            focus: isLowEnergy ? ['Recovery', 'Mobility'] : hasEquipment ? ['Upper Body', 'Lower Body'] : ['Full Body'],
            blocks: [
              {
                name: 'Warm-up',
                items: [
                  { exercise: 'Dynamic stretching', sets: 1, reps: '5-8 min', RIR: 0 }
                ]
              },
              {
                name: isLowEnergy ? 'Light Movement' : 'Main Workout',
                items: isLowEnergy ? [
                  { exercise: 'Gentle yoga flow', sets: 1, reps: '15-20 min', RIR: 0 },
                  { exercise: 'Walking', sets: 1, reps: '10-15 min', RIR: 0 }
                ] : hasEquipment ? [
                  { exercise: 'Compound movement', sets: 3, reps: '8-12', RIR: 2 },
                  { exercise: 'Accessory work', sets: 3, reps: '10-15', RIR: 2 }
                ] : [
                  { exercise: 'Bodyweight Squats', sets: 3, reps: '10-15', RIR: 2 },
                  { exercise: 'Push-ups', sets: 3, reps: '8-12', RIR: 2 },
                  { exercise: 'Plank', sets: 3, reps: '30-60s', RIR: 1 }
                ]
              }
            ],
            notes: `Adaptive plan based on ${checkin.energy}/10 energy level. AI generation will be available shortly.`
          },
          nutrition: {
            total_kcal: targetCals,
            protein_g: targetProtein,
            meals: [
              {
                name: 'Breakfast',
                items: user.dietaryPrefs.includes('Vegetarian') ? [
                  { food: 'Oatmeal with plant protein', qty: '1 bowl' },
                  { food: 'Almond butter', qty: '2 tbsp' }
                ] : user.dietaryPrefs.includes('Eggitarian') ? [
                  { food: 'Scrambled eggs with vegetables', qty: '3 eggs' },
                  { food: 'Whole grain toast', qty: '2 slices' }
                ] : [
                  { food: 'Greek yogurt with berries', qty: '200g yogurt + 1 cup berries' },
                  { food: 'Granola', qty: '1/4 cup' }
                ]
              },
              {
                name: 'Lunch',
                items: user.dietaryPrefs.includes('Vegetarian') ? [
                  { food: 'Quinoa bowl with legumes', qty: '1.5 cups' },
                  { food: 'Mixed vegetables', qty: '2 cups' }
                ] : user.dietaryPrefs.includes('Eggitarian') ? [
                  { food: 'Egg salad sandwich', qty: '2 eggs + 2 slices bread' },
                  { food: 'Side salad', qty: '2 cups' }
                ] : [
                  { food: 'Grilled chicken breast', qty: '150g' },
                  { food: 'Brown rice', qty: '1 cup cooked' },
                  { food: 'Steamed vegetables', qty: '2 cups' }
                ]
              },
              {
                name: 'Post-Workout',
                items: user.supplements?.includes('Whey Protein') || user.supplements?.includes('Protein') ? [
                  { food: 'Protein shake', qty: '1 scoop' },
                  { food: 'Banana', qty: '1 medium' }
                ] : [
                  { food: 'Chocolate milk', qty: '2 cups' },
                  { food: 'Rice cakes', qty: '2 pieces' }
                ]
              },
              {
                name: 'Dinner',
                items: user.dietaryPrefs.includes('Vegetarian') ? [
                  { food: 'Tofu stir-fry', qty: '200g tofu' },
                  { food: 'Brown rice', qty: '1 cup cooked' }
                ] : user.dietaryPrefs.includes('Eggitarian') ? [
                  { food: 'Vegetable frittata', qty: '3 eggs + vegetables' },
                  { food: 'Sweet potato', qty: '1 medium' }
                ] : [
                  { food: 'Salmon fillet', qty: '150g' },
                  { food: 'Quinoa', qty: '1 cup cooked' },
                  { food: 'Roasted vegetables', qty: '2 cups' }
                ]
              }
            ],
            hydration_l: 2.5
          },
          recovery: {
            mobility: isLowEnergy ? [
              'Gentle stretching (10 min)',
              'Deep breathing exercises (5 min)'
            ] : [
              'Post-workout stretching (10 min)',
              'Foam rolling if available (5-10 min)'
            ],
            sleep: [
              `Target: ${Math.max(7, 9 - (checkin.stress || 3))} hours tonight`,
              'Create a calming bedtime routine',
              checkin.stress && checkin.stress > 6 ? 'Consider meditation before bed' : 'Avoid screens 1 hour before bed'
            ]
          },
          motivation: isLowEnergy ? 
            "Rest is part of progress. Listen to your body and be gentle with yourself today. 🌱" :
            checkin.motivation && checkin.motivation >= 8 ?
            `Your motivation is sky-high! Channel this energy into crushing your goals! 🚀` :
            `Every rep counts toward your fitness journey. ${user.personalGoals?.length ? `Remember: ${user.personalGoals[0]}!` : 'Stay consistent!'} 💪`,
          adherence: 0,
        };
      };
      
      const todayCheckinData = getTodayCheckin();
      if (!user || !todayCheckinData) {
        throw new Error('Missing user or checkin data for fallback plan');
      }
      const fallbackPlan = adaptiveFallbackPlan(user, todayCheckinData);

      await addPlan(fallbackPlan);
      
      setTimeout(() => {
        setIsGenerating(false);
        router.replace('/plan');
      }, 1000);
    }
  }, [user, getTodayCheckin, getRecentCheckins, addPlan, getCurrentBasePlan]);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      setMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);

    generatePlan();

    return () => clearInterval(messageInterval);
  }, [generatePlan, fadeAnim]);



  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <Stack.Screen 
        options={{ 
          headerShown: false,
        }} 
      />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.loadingContainer}>
            <View style={styles.spinner}>
              <View style={styles.spinnerInner} />
            </View>
            
            <Text style={styles.title}>Creating Your Plan</Text>
            
            <Animated.View style={styles.messageContainer}>
              <Text style={styles.message}>
                {LOADING_MESSAGES[messageIndex]}
              </Text>
            </Animated.View>

            <View style={styles.dotsContainer}>
              <View style={[styles.dot, styles.dot1]} />
              <View style={[styles.dot, styles.dot2]} />
              <View style={[styles.dot, styles.dot3]} />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  spinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  spinnerInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  messageContainer: {
    opacity: 1,
  },
  message: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 40,
    minHeight: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
});