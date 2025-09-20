import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Animated } from 'react-native';
import { router, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '@/hooks/useUserStore';
import type { User, WeeklyBasePlan } from '@/types/user';
import { theme } from '@/constants/colors';

const generateWeeklyBasePlan = async (user: User): Promise<WeeklyBasePlan> => {
  if (!user) {
    throw new Error('Invalid user data');
  }

  // Build comprehensive user profile for base plan generation
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
    // New specifics
    user.preferredExercises?.length ? `Preferred exercises: ${user.preferredExercises.join(', ')}` : '',
    user.avoidExercises?.length ? `Avoid exercises: ${user.avoidExercises.join(', ')}` : '',
    user.preferredTrainingTime ? `Preferred time: ${user.preferredTrainingTime}` : '',
    user.sessionLength ? `Session length: ${user.sessionLength} minutes` : '',
    user.travelDays ? `Travel days/month: ${user.travelDays}` : '',
    user.fastingWindow ? `Fasting: ${user.fastingWindow}` : '',
    user.mealCount ? `Meals/day: ${user.mealCount}` : '',
    user.injuries ? `Injuries/limitations: ${user.injuries}` : '',
    user.stepTarget ? `Step target: ${user.stepTarget}` : '',
    user.preferredWorkoutSplit ? `Preferred split: ${user.preferredWorkoutSplit}` : '',
    user.specialRequests ? `Special requests: ${user.specialRequests}` : '',
  ].filter(Boolean).join('\n');

  const targetCalories = user.dailyCalorieTarget || 2000;
  const proteinTarget = user.weight ? Math.round(user.weight * 2.2 * 0.9) : Math.round(targetCalories * 0.3 / 4);

  const systemPrompt = `You are a world-class Personal Trainer & Nutrition Specialist. Create a 7-Day Base Plan that EXACTLY matches the user's specific requirements. DO NOT use generic templates.

=== USER'S EXACT REQUIREMENTS ===
${userProfile}

=== MANDATORY CONSTRAINTS ===
🏋️ EQUIPMENT AVAILABLE: ${user.equipment.join(', ')}
🎯 FITNESS GOAL: ${user.goal}
📅 TRAINING DAYS: ${user.trainingDays} days per week
⏱️ SESSION LENGTH: ${user.sessionLength || 45} minutes MAX
🍽️ DIETARY PREFERENCE: ${user.dietaryPrefs.join(', ')}
🍴 MEALS PER DAY: ${user.mealCount || 4}
⏰ FASTING WINDOW: ${user.fastingWindow || 'No fasting'}
🚫 AVOID EXERCISES: ${user.avoidExercises?.join(', ') || 'None'}
✅ PREFERRED EXERCISES: ${user.preferredExercises?.join(', ') || 'None'}
🏥 INJURIES/LIMITATIONS: ${user.injuries || 'None'}
📝 SPECIAL REQUESTS: ${user.specialRequests || 'None'}

=== CRITICAL RULES ===
1. Use ONLY the equipment they listed: ${user.equipment.join(', ')}
2. If they prefer certain exercises, INCLUDE them in the plan
3. If they want to avoid exercises, DO NOT include them
4. Follow their dietary preference strictly: ${user.dietaryPrefs.join(', ')}
5. Respect their food notes: ${user.dietaryNotes || 'None'}
6. Honor their special requests: ${user.specialRequests || 'None'}
7. Keep sessions under ${user.sessionLength || 45} minutes
8. Plan for ${user.mealCount || 4} meals per day

=== NUTRITION TARGETS ===
Daily Calories: ${targetCalories}kcal
Daily Protein: ${proteinTarget}g
Hydration: 2.5L water

Return ONLY valid JSON with this exact structure:
{
  "days": {
    "monday": {
      "workout": {
        "focus": ["Primary muscle groups"],
        "blocks": [
          {
            "name": "Warm-up",
            "items": [{"exercise": "Dynamic stretching", "sets": 1, "reps": "5-8 min", "RIR": 0}]
          },
          {
            "name": "Main Workout", 
            "items": [
              {"exercise": "Specific exercise name", "sets": 3, "reps": "8-12", "RIR": 2},
              {"exercise": "Another exercise", "sets": 3, "reps": "10-15", "RIR": 2}
            ]
          }
        ],
        "notes": "Specific notes for this day"
      },
      "nutrition": {
        "total_kcal": ${targetCalories},
        "protein_g": ${proteinTarget},
        "meals": [
          {
            "name": "Breakfast",
            "items": [{"food": "Specific food item", "qty": "Exact quantity"}]
          }
        ],
        "hydration_l": 2.5
      },
      "recovery": {
        "mobility": ["Specific mobility work"],
        "sleep": ["Sleep optimization tip"]
      }
    },
    "tuesday": { /* complete structure */ },
    "wednesday": { /* complete structure */ },
    "thursday": { /* complete structure */ },
    "friday": { /* complete structure */ },
    "saturday": { /* complete structure */ },
    "sunday": { /* complete structure */ }
  }
}`

  const requestBody = {
    messages: [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      {
        role: 'user' as const,
        content: `Create my personalized 7-Day Base Plan using these EXACT specifications:

🏋️ EQUIPMENT: ${user.equipment.join(', ')} (use ONLY these)
🎯 GOAL: ${user.goal}
📅 TRAINING: ${user.trainingDays} days/week, ${user.sessionLength || 45} min sessions
🍽️ DIET: ${user.dietaryPrefs.join(', ')}, ${user.mealCount || 4} meals/day
⏰ FASTING: ${user.fastingWindow || 'No fasting'}
✅ INCLUDE: ${user.preferredExercises?.join(', ') || 'No preferences'}
🚫 AVOID: ${user.avoidExercises?.join(', ') || 'Nothing to avoid'}
🏥 LIMITATIONS: ${user.injuries || 'None'}
📝 SPECIAL: ${user.specialRequests || 'None'}

Food preferences: ${user.dietaryNotes || 'None'}
Personal goals: ${user.personalGoals?.join(', ') || 'None'}

Make this plan SPECIFIC to my requirements. Don't use generic exercises if I have equipment preferences. Don't suggest foods that conflict with my dietary preference. Follow my special requests exactly.

Return only the JSON structure with complete 7-day plan.`
      }
    ]
  };

  console.log('🏗️ Generating 7-Day Base Plan with AI...');
  console.log('📊 User Profile Summary:');
  console.log('  - Goal:', user.goal);
  console.log('  - Training Days:', user.trainingDays);
  console.log('  - Equipment:', user.equipment.join(', '));
  console.log('  - Preferred Exercises:', user.preferredExercises?.join(', ') || 'None');
  console.log('  - Avoid Exercises:', user.avoidExercises?.join(', ') || 'None');
  console.log('  - Dietary Preference:', user.dietaryPrefs.join(', '));
  console.log('  - Food Notes:', user.dietaryNotes || 'None');
  console.log('  - Session Length:', user.sessionLength || 45, 'minutes');
  console.log('  - Meal Count:', user.mealCount || 4);
  console.log('  - Fasting Window:', user.fastingWindow || 'No fasting');
  console.log('  - Special Requests:', user.specialRequests || 'None');
  console.log('  - Age:', user.age || 'Not specified');
  console.log('  - Weight:', user.weight || 'Not specified');
  console.log('  - Height:', user.height || 'Not specified');
  console.log('  - Personal Goals:', user.personalGoals?.join(', ') || 'None');
  console.log('  - Perceived Lacks:', user.perceivedLacks?.join(', ') || 'None');
  console.log('  - Supplements:', user.supplements?.join(', ') || 'None');
  console.log('  - Injuries:', user.injuries || 'None');
  console.log('\n🤖 Sending request to AI with user profile:');
  console.log('Full user profile being sent:', userProfile);

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
    console.log('✅ Base Plan API Response received');
    
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
    
    if (jsonStart === -1 || jsonEnd === -1) {
      console.log('❌ Failed to find JSON boundaries');
      console.log('Response preview:', cleanedResponse.substring(0, 500));
      throw new Error('Failed to parse AI response: No valid JSON found');
    }
    
    let jsonString = cleanedResponse.substring(jsonStart, jsonEnd);
    console.log('Extracted JSON string length:', jsonString.length);
    console.log('JSON preview:', jsonString.substring(0, 200));
    
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
      console.log('✅ Successfully parsed Base Plan JSON');
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
    if (!parsedPlan || typeof parsedPlan !== 'object' || !parsedPlan.days) {
      throw new Error('AI response is not a valid base plan structure');
    }
    
    const requiredDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const day of requiredDays) {
      if (!parsedPlan.days[day] || !parsedPlan.days[day].workout || !parsedPlan.days[day].nutrition || !parsedPlan.days[day].recovery) {
        throw new Error(`Invalid plan structure for ${day}`);
      }
    }
    
    console.log('🎯 Base Plan generated successfully');
    console.log('\n📋 Plan Validation:');
    console.log('Monday workout focus:', parsedPlan.days.monday.workout?.focus || 'N/A');
    console.log('Monday exercises:', parsedPlan.days.monday.workout?.blocks?.[1]?.items?.map((item: any) => item.exercise).join(', ') || 'N/A');
    console.log('Daily calories:', parsedPlan.days.monday.nutrition?.total_kcal || 'N/A');
    console.log('Meal count:', parsedPlan.days.monday.nutrition?.meals?.length || 'N/A');
    console.log('First meal food:', parsedPlan.days.monday.nutrition?.meals?.[0]?.items?.[0]?.food || 'N/A');
    console.log('\n🔍 Checking if AI followed user preferences:');
    console.log('User equipment:', user.equipment.join(', '));
    console.log('User dietary pref:', user.dietaryPrefs.join(', '));
    console.log('User preferred exercises:', user.preferredExercises?.join(', ') || 'None');
    console.log('User avoid exercises:', user.avoidExercises?.join(', ') || 'None');
    console.log('User special requests:', user.specialRequests || 'None');
    
    const basePlan: WeeklyBasePlan = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      days: parsedPlan.days,
      isLocked: false,
    };
    
    return basePlan;
    
  } catch (parseError) {
    console.error('❌ Error generating base plan:', parseError);
    throw new Error(`Failed to generate base plan: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
  }
};

const LOADING_MESSAGES = [
  "Analyzing your comprehensive profile...",
  "Designing your perfect workout split...",
  "Creating your nutrition templates...",
  "Optimizing for your preferences...",
  "Building your 7-day foundation...",
  "Finalizing your base plan...",
];

export default function GeneratingBasePlanScreen() {
  const { user, addBasePlan } = useUserStore();
  const [messageIndex, setMessageIndex] = useState(0);
  const [, setIsGenerating] = useState(true);
  const fadeAnim = useMemo(() => new Animated.Value(1), []);

  const generatePlan = useCallback(async () => {
    try {
      if (!user) {
        throw new Error('No user data available');
      }

      const basePlan = await generateWeeklyBasePlan(user);
      await addBasePlan(basePlan);
      
      setTimeout(() => {
        setIsGenerating(false);
        router.replace('/plan-preview');
      }, 1000);

    } catch (error) {
      console.error('❌ Error generating base plan:', error);
      console.log('\n🔧 Falling back to adaptive plan based on user preferences...');
      console.log('User data available for fallback:', {
        goal: user?.goal,
        equipment: user?.equipment,
        dietaryPrefs: user?.dietaryPrefs,
        preferredExercises: user?.preferredExercises,
        avoidExercises: user?.avoidExercises,
        specialRequests: user?.specialRequests
      });
      
      // Generate an adaptive fallback base plan based on user preferences
      const isVegetarian = user?.dietaryPrefs.includes('Vegetarian');
      const isEggitarian = user?.dietaryPrefs.includes('Eggitarian');
      const hasGym = user?.equipment.includes('Gym') || user?.equipment.includes('Dumbbells');
      // const hasBodyweight = user?.equipment.includes('Bodyweight');
      const preferredExercises = user?.preferredExercises || [];
      const avoidExercises = user?.avoidExercises || [];
      
      // Adaptive exercise selection
      const getAdaptiveExercises = (focus: string) => {
        const baseExercises = {
          'Upper Body': hasGym ? 
            ['Bench Press', 'Dumbbell Rows', 'Shoulder Press', 'Pull-ups'] :
            ['Push-ups', 'Pike Push-ups', 'Tricep Dips', 'Plank to Downward Dog'],
          'Lower Body': hasGym ?
            ['Squats', 'Deadlifts', 'Lunges', 'Calf Raises'] :
            ['Bodyweight Squats', 'Single-leg Deadlifts', 'Lunges', 'Calf Raises'],
          'Full Body': hasGym ?
            ['Burpees', 'Thrusters', 'Mountain Climbers'] :
            ['Burpees', 'Jumping Jacks', 'Mountain Climbers']
        };
        
        let exercises = baseExercises[focus as keyof typeof baseExercises] || baseExercises['Full Body'];
        
        // Include preferred exercises if they match the focus
        if (preferredExercises.length > 0) {
          exercises = [...preferredExercises.slice(0, 2), ...exercises.slice(0, 2)];
        }
        
        // Remove avoided exercises
        if (avoidExercises.length > 0) {
          exercises = exercises.filter(ex => !avoidExercises.some(avoid => 
            ex.toLowerCase().includes(avoid.toLowerCase()) || avoid.toLowerCase().includes(ex.toLowerCase())
          ));
        }
        
        return exercises.slice(0, 3);
      };
      
      // Adaptive meal planning
      const getAdaptiveMeals = () => {
        if (isVegetarian) {
          return [
            {
              name: 'Breakfast',
              items: [
                { food: 'Oatmeal with plant protein powder', qty: '1 bowl' },
                { food: 'Mixed berries', qty: '1 cup' },
                { food: 'Almond butter', qty: '1 tbsp' }
              ]
            },
            {
              name: 'Lunch',
              items: [
                { food: 'Quinoa Buddha bowl', qty: '1.5 cups' },
                { food: 'Chickpeas', qty: '1/2 cup' },
                { food: 'Mixed vegetables', qty: '2 cups' }
              ]
            },
            {
              name: 'Dinner',
              items: [
                { food: 'Tofu stir-fry', qty: '200g tofu' },
                { food: 'Brown rice', qty: '1 cup cooked' },
                { food: 'Steamed broccoli', qty: '2 cups' }
              ]
            }
          ];
        } else if (isEggitarian) {
          return [
            {
              name: 'Breakfast',
              items: [
                { food: 'Scrambled eggs with vegetables', qty: '3 eggs' },
                { food: 'Whole grain toast', qty: '2 slices' },
                { food: 'Avocado', qty: '1/2 medium' }
              ]
            },
            {
              name: 'Lunch',
              items: [
                { food: 'Vegetable omelet', qty: '3 eggs' },
                { food: 'Mixed green salad', qty: '2 cups' },
                { food: 'Quinoa', qty: '1 cup cooked' }
              ]
            },
            {
              name: 'Dinner',
              items: [
                { food: 'Egg fried rice with vegetables', qty: '2 eggs + 1 cup rice' },
                { food: 'Steamed vegetables', qty: '2 cups' }
              ]
            }
          ];
        } else {
          return [
            {
              name: 'Breakfast',
              items: [
                { food: 'Greek yogurt with protein powder', qty: '200g yogurt + 1 scoop' },
                { food: 'Banana', qty: '1 medium' },
                { food: 'Granola', qty: '1/4 cup' }
              ]
            },
            {
              name: 'Lunch',
              items: [
                { food: 'Grilled chicken breast', qty: '150g' },
                { food: 'Brown rice', qty: '1 cup cooked' },
                { food: 'Mixed vegetables', qty: '2 cups' }
              ]
            },
            {
              name: 'Dinner',
              items: [
                { food: 'Salmon fillet', qty: '150g' },
                { food: 'Sweet potato', qty: '1 medium' },
                { food: 'Green salad', qty: '2 cups' }
              ]
            }
          ];
        }
      };
      
      const fallbackBasePlan: WeeklyBasePlan = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        days: {
          monday: {
            workout: {
              focus: ['Upper Body'],
              blocks: [
                {
                  name: 'Warm-up',
                  items: [{ exercise: 'Dynamic stretching', sets: 1, reps: '5-8 min', RIR: 0 }]
                },
                {
                  name: 'Main Workout',
                  items: getAdaptiveExercises('Upper Body').map(exercise => ({
                    exercise,
                    sets: 3,
                    reps: hasGym ? '8-12' : '10-15',
                    RIR: 2
                  }))
                }
              ],
              notes: `Adapted for ${user?.equipment.join(', ')} equipment. ${user?.specialRequests ? `Special note: ${user.specialRequests}` : ''}`
            },
            nutrition: {
              total_kcal: user?.dailyCalorieTarget || 2000,
              protein_g: user?.weight ? Math.round(user.weight * 2.2 * 0.9) : 150,
              meals: getAdaptiveMeals(),
              hydration_l: 2.5
            },
            recovery: {
              mobility: ['10-minute post-workout stretch', user?.injuries ? 'Gentle mobility for injury areas' : 'Foam rolling if available'],
              sleep: ['Target 7-8 hours', 'Avoid screens 1 hour before bed']
            }
          },
          tuesday: {
            workout: {
              focus: ['Lower Body'],
              blocks: [
                {
                  name: 'Warm-up',
                  items: [{ exercise: 'Dynamic leg swings', sets: 1, reps: '5-8 min', RIR: 0 }]
                },
                {
                  name: 'Main Workout',
                  items: getAdaptiveExercises('Lower Body').map(exercise => ({
                    exercise,
                    sets: 3,
                    reps: hasGym ? '8-12' : '12-15',
                    RIR: 2
                  }))
                }
              ],
              notes: `Lower body focus with ${user?.equipment.join(', ')} equipment`
            },
            nutrition: {
              total_kcal: user?.dailyCalorieTarget || 2000,
              protein_g: user?.weight ? Math.round(user.weight * 2.2 * 0.9) : 150,
              meals: getAdaptiveMeals(),
              hydration_l: 2.5
            },
            recovery: {
              mobility: ['Hip flexor stretches', 'Hamstring stretches'],
              sleep: ['Target 7-8 hours', 'Keep room cool and dark']
            }
          },
          wednesday: {
            workout: { 
              focus: ['Rest/Active Recovery'], 
              blocks: [{ 
                name: 'Light Activity', 
                items: [{ 
                  exercise: user?.injuries ? 'Gentle walking' : 'Walking or gentle yoga', 
                  sets: 1, 
                  reps: '20-30 min', 
                  RIR: 0 
                }] 
              }], 
              notes: `Rest day - ${user?.injuries ? 'Modified for injury recovery' : 'Listen to your body'}` 
            },
            nutrition: { 
              total_kcal: user?.dailyCalorieTarget || 2000, 
              protein_g: user?.weight ? Math.round(user.weight * 2.2 * 0.9) : 150, 
              meals: getAdaptiveMeals(), 
              hydration_l: 2.5 
            },
            recovery: { 
              mobility: ['Full body gentle stretching'], 
              sleep: ['Focus on relaxation'] 
            }
          },
          thursday: {
            workout: { 
              focus: ['Upper Body'], 
              blocks: [
                { name: 'Warm-up', items: [{ exercise: 'Arm circles', sets: 1, reps: '5 min', RIR: 0 }] }, 
                { name: 'Main', items: getAdaptiveExercises('Upper Body').slice(0, 2).map(exercise => ({
                  exercise,
                  sets: 3,
                  reps: hasGym ? '8-12' : '10-15',
                  RIR: 2
                })) }
              ], 
              notes: `Upper body focus - session ${user?.sessionLength || 45} minutes` 
            },
            nutrition: { 
              total_kcal: user?.dailyCalorieTarget || 2000, 
              protein_g: user?.weight ? Math.round(user.weight * 2.2 * 0.9) : 150, 
              meals: getAdaptiveMeals(), 
              hydration_l: 2.5 
            },
            recovery: { 
              mobility: ['Upper body stretches'], 
              sleep: ['Consistent bedtime'] 
            }
          },
          friday: {
            workout: { 
              focus: ['Lower Body'], 
              blocks: [
                { name: 'Warm-up', items: [{ exercise: 'Leg swings', sets: 1, reps: '5 min', RIR: 0 }] }, 
                { name: 'Main', items: getAdaptiveExercises('Lower Body').slice(0, 2).map(exercise => ({
                  exercise,
                  sets: 3,
                  reps: hasGym ? '8-12' : '12-15',
                  RIR: 2
                })) }
              ], 
              notes: 'End week strong with lower body focus' 
            },
            nutrition: { 
              total_kcal: user?.dailyCalorieTarget || 2000, 
              protein_g: user?.weight ? Math.round(user.weight * 2.2 * 0.9) : 150, 
              meals: getAdaptiveMeals(), 
              hydration_l: 2.5 
            },
            recovery: { 
              mobility: ['Lower body focus'], 
              sleep: ['Prepare for weekend'] 
            }
          },
          saturday: {
            workout: { 
              focus: ['Full Body/Fun'], 
              blocks: [{ 
                name: 'Activity', 
                items: [{ 
                  exercise: preferredExercises.length > 0 ? preferredExercises[0] : 'Sport or outdoor activity', 
                  sets: 1, 
                  reps: '30-60 min', 
                  RIR: 1 
                }] 
              }], 
              notes: 'Enjoy movement and have fun!' 
            },
            nutrition: { 
              total_kcal: user?.dailyCalorieTarget || 2000, 
              protein_g: user?.weight ? Math.round(user.weight * 2.2 * 0.9) : 150, 
              meals: getAdaptiveMeals(), 
              hydration_l: 2.5 
            },
            recovery: { 
              mobility: ['Gentle stretching'], 
              sleep: ['Flexible timing'] 
            }
          },
          sunday: {
            workout: { 
              focus: ['Rest/Prep'], 
              blocks: [{ 
                name: 'Light', 
                items: [{ 
                  exercise: 'Gentle walk or yoga', 
                  sets: 1, 
                  reps: '20-30 min', 
                  RIR: 0 
                }] 
              }], 
              notes: 'Prepare for next week with light movement' 
            },
            nutrition: { 
              total_kcal: user?.dailyCalorieTarget || 2000, 
              protein_g: user?.weight ? Math.round(user.weight * 2.2 * 0.9) : 150, 
              meals: getAdaptiveMeals(), 
              hydration_l: 2.5 
            },
            recovery: { 
              mobility: ['Full body maintenance'], 
              sleep: ['Early bedtime for Monday'] 
            }
          }
        },
        isLocked: false,
      };
      
      console.log('\n🔧 Generated adaptive fallback plan with user preferences:');
      console.log('- Equipment adapted:', user?.equipment.join(', '));
      console.log('- Dietary preference:', user?.dietaryPrefs.join(', '));
      console.log('- Preferred exercises included:', preferredExercises.slice(0, 2).join(', ') || 'None');
      console.log('- Avoided exercises:', avoidExercises.join(', ') || 'None');
      console.log('- Special requests noted:', user?.specialRequests || 'None');

      await addBasePlan(fallbackBasePlan);
      
      setTimeout(() => {
        setIsGenerating(false);
        router.replace('/plan-preview');
      }, 1000);
    }
  }, [user, addBasePlan]);

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
    }, 2500);

    generatePlan();

    return () => clearInterval(messageInterval);
  }, [generatePlan, fadeAnim]);

  return (
    <LinearGradient
      colors={['#FF5C5C', '#FF4444', '#FF2222', '#1A1A1A', '#0C0C0D']}
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
            
            <Text style={styles.title}>Building Your Journey</Text>
            
            <Animated.View style={[styles.messageContainer, { opacity: fadeAnim }]}>
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
    minHeight: 24,
    justifyContent: 'center',
  },
  message: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 40,
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