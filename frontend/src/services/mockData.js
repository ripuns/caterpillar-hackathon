/**
 * Mock Fixture Data complying 100% with CONTRACTS.md
 * Provides rich initial data for the 5 hackathon outcomes:
 * 1. GET /tasks
 * 2. GET /safety-alerts
 * 3. GET /behavior-flags
 * 4. POST /predict-task-time (model & fallback simulator)
 * 5. GET /training-hub (articles, videos, simulations, instructor booking)
 */

export const INITIAL_OPERATOR = {
  operatorId: 'OP-04',
  name: 'Marcus Vance',
  skillLevel: 'Intermediate', // Beginner | Intermediate | Expert
  experienceYears: 4,
  shiftStartTime: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(),
  assignedMachineId: 'M-12',
  machineModel: 'CAT 336 Hydraulic Excavator',
  machineAgeYears: 3,
};

export const INITIAL_MACHINES = [
  { id: 'M-12', name: 'CAT 336 Hydraulic Excavator', age: 3, engineHours: 1420.5, fuelLevelPct: 78, status: 'Active' },
  { id: 'M-07', name: 'CAT 988K Wheel Loader', age: 5, engineHours: 3280.0, fuelLevelPct: 62, status: 'Active' },
  { id: 'M-03', name: 'CAT D6 Dozer', age: 2, engineHours: 890.2, fuelLevelPct: 91, status: 'Idle' },
  { id: 'M-09', name: 'CAT 745 Articulated Truck', age: 6, engineHours: 4120.8, fuelLevelPct: 45, status: 'Maintenance' },
];

export const INITIAL_TASKS = [
  {
    taskId: 'T001',
    taskType: 'Earth Excavation',
    machineId: 'M-12',
    operatorId: 'OP-04',
    scheduledStart: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    status: 'in_progress', // pending | in_progress | completed
    weather: 'Sunny',
    estimatedTimeMin: 60,
    priority: 'High',
    location: 'Sector 4 - Foundation Pit Alpha',
    progressPct: 65,
    notes: 'Excavate 450 cubic meters of subsoil down to bedrock level.',
  },
  {
    taskId: 'T002',
    taskType: 'Trenching',
    machineId: 'M-12',
    operatorId: 'OP-04',
    scheduledStart: new Date(Date.now() + 1 * 3600 * 1000).toISOString(),
    status: 'pending',
    weather: 'Rainy',
    estimatedTimeMin: 45,
    priority: 'Medium',
    location: 'East Corridor - Utility Line Bravo',
    progressPct: 0,
    notes: '2.5m depth drainage trench along the perimeter fence.',
  },
  {
    taskId: 'T003',
    taskType: 'Material Loading',
    machineId: 'M-12',
    operatorId: 'OP-04',
    scheduledStart: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
    status: 'pending',
    weather: 'Cloudy',
    estimatedTimeMin: 30,
    priority: 'Medium',
    location: 'Stockpile 2 to Haul Trucks',
    progressPct: 0,
    notes: 'Load crushed limestone aggregate into 4 incoming CAT 745 trucks.',
  },
  {
    taskId: 'T004',
    taskType: 'Grading',
    machineId: 'M-12',
    operatorId: 'OP-04',
    scheduledStart: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    status: 'completed',
    weather: 'Sunny',
    estimatedTimeMin: 35,
    actualTimeMin: 33,
    priority: 'Low',
    location: 'North Access Road',
    progressPct: 100,
    notes: 'Grade sub-base for asphalt prep. Completed ahead of schedule.',
  },
  {
    taskId: 'T005',
    taskType: 'Demolition',
    machineId: 'M-12',
    operatorId: 'OP-04',
    scheduledStart: new Date(Date.now() + 5.5 * 3600 * 1000).toISOString(),
    status: 'pending',
    weather: 'Windy',
    estimatedTimeMin: 90,
    priority: 'High',
    location: 'Old Warehouse Structure C',
    progressPct: 0,
    notes: 'Hydraulic breaker attachment required. Maintain strict perimeter safety zone.',
  },
];

export const INITIAL_SAFETY_ALERTS = [
  {
    alertId: 'A001',
    machineId: 'M-12',
    operatorId: 'OP-04',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    type: 'seatbelt', // seatbelt | proximity | incident
    message: 'Seatbelt unfastened while machine active',
    severity: 'high', // low | medium | high
    acknowledged: false,
    details: 'Engine RPM was 1,850 when primary cab harness interlock sensor disconnected.',
  },
  {
    alertId: 'A002',
    machineId: 'M-12',
    operatorId: 'OP-04',
    timestamp: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
    type: 'proximity',
    message: 'Proximity alert: Obstacle detected at 2.1m (Threshold < 3.0m)',
    severity: 'high',
    acknowledged: true,
    details: 'Ultrasonic Rear-Right Sensor detected stationary service pickup truck within safety envelope.',
  },
  {
    alertId: 'A003',
    machineId: 'M-12',
    operatorId: 'OP-04',
    timestamp: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    type: 'proximity',
    message: 'Proximity warning: Personnel beacon detected at 2.8m',
    severity: 'medium',
    acknowledged: true,
    details: 'Ground worker transponder pinged in boom swing perimeter. Operator throttled down safely.',
  },
  {
    alertId: 'A004',
    machineId: 'M-12',
    operatorId: 'OP-04',
    timestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    type: 'incident',
    message: 'Incident Logged: Rapid hydraulic pressure spike during bucket cycle',
    severity: 'low',
    acknowledged: true,
    details: 'Pressure relief valve engaged. System returned to nominal operating limits.',
  },
];

export const INITIAL_BEHAVIOR_FLAGS = [
  {
    flagId: 'F001',
    machineId: 'M-12',
    operatorId: 'OP-04',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    type: 'excessive_idling', // excessive_idling | unsafe_pattern
    value: 52,
    threshold: 45,
    message: 'Idling time 52 min exceeds 45 min threshold',
    severity: 'medium',
    status: 'Active',
    recommendation: 'Shut down engine during material staging to conserve fuel and prevent carbon buildup.',
  },
  {
    flagId: 'F002',
    machineId: 'M-12',
    operatorId: 'OP-04',
    timestamp: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    type: 'unsafe_pattern',
    value: 3,
    threshold: 3,
    message: 'Unsafe pattern: Operator triggered 3 safety alerts within current session history',
    severity: 'high',
    status: 'Under Review',
    recommendation: 'Site supervisor review recommended. Prompt operator to review Module TH001: Safe Excavation Practices.',
  },
];

export const INITIAL_TRAINING_MODULES = [
  // -------------------------------------------------------------
  // 1. CERTIFIED SOP ARTICLES (Standard Operating Procedures)
  // -------------------------------------------------------------
  {
    moduleId: 'TH001',
    title: 'Safe Excavation & Trenching Protocols',
    format: 'article',
    category: 'Safety Compliance',
    durationMin: 8,
    completionStatus: 'Completed',
    lastReviewed: '2026-09-20',
    summary: 'OSHA & Caterpillar standard operating envelopes, underground 811 utility markings, and soil cave-in prevention.',
    checklist: [
      'Verified 811 underground utility marks and marked clearances',
      '3-point seatbelt harness securely latched in cab',
      '3.0m stand-off safety envelope confirmed with ground crew',
      'Trench shoring or benching angle matched to soil classification',
    ],
    quiz: [
      {
        question: 'What is the minimum safety envelope distance required by Caterpillar proximity radar?',
        options: ['1.5 meters', '3.0 meters', '5.0 meters', '10.0 meters'],
        correctIndex: 1,
        explanation: 'Caterpillar standard safety envelope enforces a strict 3.0m stand-off boundary around all rotating machinery.',
      },
      {
        question: 'At what excavation depth is certified shoring or benching mandatory?',
        options: ['0.5 meters', '1.0 meter', '1.5 meters (5 ft)', '3.0 meters'],
        correctIndex: 2,
        explanation: 'Excavations deeper than 1.5m (5 ft) require certified benching, shoring, or trench boxes under OSHA/CAT protocols.',
      },
    ],
    content: `### 1. Pre-Excavation Site Inspection
Before initiating any earthmoving or trenching activity:
- Confirm 811 utility markings and underground line clearances.
- Ensure minimum 3.0-meter stand-off distance from stationary obstacles, trench edges, and spotters.
- Verify cab rollover protection structures (ROPS) and fasten the 3-point seatbelt harness before ignition.

### 2. Proximity Zone Management
- Maintain a continuous 360-degree visual scan before swinging the excavator boom.
- Stop operations immediately if the in-cab proximity radar alerts (< 3.0m threshold).
- Always use a dedicated ground spotter when blind-spot cameras are obscured.

### 3. Trench Cave-In Prevention & Soil Benching
- Excavations deeper than 1.5m must utilize hydraulic shoring, trench boxes, or certified benching angles.
- Type A Soil (Clay): Maximum slope 53° (3/4:1).
- Type B Soil (Silt/Loam): Maximum slope 45° (1:1).
- Type C Soil (Gravel/Wet Sand): Maximum slope 34° (1.5:1).
- Keep excavated spoil piles at least 1.0m back from the edge of the trench.`,
  },
  {
    moduleId: 'TH002',
    title: 'Eco-Operating: Reducing Excessive Engine Idling',
    format: 'article',
    category: 'Efficiency & Eco-Drive',
    durationMin: 6,
    completionStatus: 'In Progress',
    lastReviewed: '2026-09-22',
    summary: 'Techniques to prevent idling over 45 minutes, lower DEF consumption, and extend diesel engine lifespan.',
    checklist: [
      'Enabled Auto-Idle feature on in-cab display console',
      'Configured 5-minute key-down threshold for haul truck wait cycles',
      'Engaged Eco-Mode for light grading and material staging',
      'Verified DEF tank level and DPF soot level gauges',
    ],
    quiz: [
      {
        question: 'What is the excessive idling threshold monitored by the Caterpillar cab assistant?',
        options: ['15 minutes', '30 minutes', '45 minutes', '60 minutes'],
        correctIndex: 2,
        explanation: '45 minutes continuous idle triggers an automatic supervisory efficiency flag.',
      },
      {
        question: 'How much diesel fuel does a CAT C9.3B engine consume per hour of unnecessary idling?',
        options: ['0.5 Liters', '1.2 Liters', '3.5 Liters', '8.0 Liters'],
        correctIndex: 2,
        explanation: 'Heavy excavator diesel engines consume up to 3.5 liters/hr during high idle, generating unneeded carbon and DPF soot.',
      },
    ],
    content: `### 1. The Cost of Excessive Idling
- Modern CAT C9.3B diesel engines consume up to 3.5 liters of fuel per hour of idle.
- Extended idling (> 45 minutes) causes rapid DPF soot accumulation and lowers DEF exhaust temperatures below self-cleaning threshold.

### 2. Best Operating Practices
- Implement the "5-Minute Rule": If wait time for haul trucks exceeds 5 minutes, engage Auto-Idle or key down.
- Utilize Eco-Mode during light grading and staging operations to optimize hydraulic pump flow.
- Monitor your in-cab idling gauge; if idling approaches the 45-minute threshold, reset session cycle.`,
  },
  {
    moduleId: 'TH003',
    title: 'Extreme Weather Operating & Traction Control',
    format: 'article',
    category: 'Environmental Conditions',
    durationMin: 10,
    completionStatus: 'Not Started',
    lastReviewed: null,
    summary: 'Operating safely in rain, mud, and high winds: hydraulic compensation and dynamic task-time buffers.',
    checklist: [
      'Checked track grouser wear and tension before muddy operations',
      'Adjusted AI task time estimate for weather penalty (+12% rain/wind)',
      'Verified windshield wipers and high-intensity LED cab lighting',
      'Established stable excavator orientation parallel to wind gusts',
    ],
    quiz: [
      {
        question: 'How much does rain and wet clay soil reduce excavator track traction?',
        options: ['10%', '25%', 'Up to 40%', '70%'],
        correctIndex: 2,
        explanation: 'Wet clay drastically lowers ground friction coefficients, cutting traction by up to 40%.',
      },
    ],
    content: `### 1. Rain & Wet Terrain Hazards
- Wet clay and saturated soils reduce track traction by up to 40%.
- Trenching during rain requires 15% additional buffer time due to hydraulic resistance and soil slumping.

### 2. Wind & Structural Demolition
- High winds (> 35 km/h) dramatically increase the risk during high-reach demolition tasks.
- Keep excavator boom aligned parallel with heavy wind direction when possible to avoid lateral stress.`,
  },
  {
    moduleId: 'TH004',
    title: 'Daily Machine Walkaround & Hydraulic Inspection',
    format: 'article',
    category: 'Equipment Mastery',
    durationMin: 7,
    completionStatus: 'Completed',
    lastReviewed: '2026-09-18',
    summary: 'Caterpillar 10-point circle check: hydraulic hose integrity, fluid levels, track tension, and emergency cutoffs.',
    checklist: [
      'Completed 360° visual circle check before entering cab',
      'Inspected high-pressure hydraulic lines for seepage or blisters',
      'Checked engine oil, hydraulic fluid, and coolant levels',
      'Tested emergency engine cutoff switch and horn operation',
    ],
    quiz: [
      {
        question: 'What is the first rule of entering or exiting any CAT heavy machine cab?',
        options: ['Jump clear of tracks', 'Always maintain 3-point contact', 'Keep one hand in pocket', 'Carry heavy tools in hand'],
        correctIndex: 1,
        explanation: 'Maintaining 3-point contact (2 hands + 1 foot or 1 hand + 2 feet) prevents 95% of cab access slip-and-fall injuries.',
      },
    ],
    content: `### 1. The Pre-Shift Circle Check
Conduct a structured 360° walkaround inspection every morning before startup:
- Check undercarriage and track pads for loose rock wedging or excessive track sag.
- Inspect hydraulic cylinders for chrome pitting, oil weeping, or wiper seal damage.
- Verify engine coolant, engine oil dipstick, and hydraulic fluid sight glass.

### 2. Cab Safety Systems Check
- Confirm ROPS/FOPS structural bolts are tightened.
- Test seatbelt latch microswitch and cab horn.
- Ensure all rear and side camera lenses are clean and unobstructed.`,
  },
  {
    moduleId: 'TH010',
    title: 'High-Voltage Power Line Clearance Protocols',
    format: 'article',
    category: 'Safety Compliance',
    durationMin: 9,
    completionStatus: 'Not Started',
    lastReviewed: null,
    summary: 'OSHA & Caterpillar electrical safety envelopes: minimum 10ft clearance, electrocution prevention, and emergency egress.',
    checklist: [
      'Identified all overhead lines within 50m of work radius',
      'Set physical boom height limiters on CAT Grade monitor',
      'Appointed a dedicated electrical safety spotter on ground',
    ],
    quiz: [
      {
        question: 'What is the absolute minimum stand-off clearance from power lines up to 50kV?',
        options: ['3 feet (1m)', '10 feet (3.05m)', '20 feet (6m)', '35 feet (10m)'],
        correctIndex: 1,
        explanation: 'OSHA standard 1926.1408 mandates at least 10 feet of clearance from lines up to 50kV.',
      },
    ],
    content: `### 1. Electrical Hazard Envelopes
- Never operate within 10 feet (3.05m) of live overhead electrical lines up to 50kV.
- For voltages > 50kV, add 4 inches (10cm) of clearance for every additional 10kV.

### 2. Emergency In-Cab Protocol During Wire Contact
- STAY IN THE CAB: The machine chassis acts as a Faraday cage. Do NOT step down.
- Swing the boom away if hydraulic controls are operational.
- If evacuation is required due to fire: JUMP clear with feet together, NEVER touch the machine and ground simultaneously.`,
  },
  {
    moduleId: 'TH_SAFE_EFFICIENT_OPS',
    title: 'Safe and Efficient Machine Operation Synthesis',
    format: 'article',
    category: 'Safety Compliance',
    durationMin: 7,
    completionStatus: 'In Progress',
    lastReviewed: '2026-09-23',
    summary: 'Cross-feature analysis: correlating seatbelt compliance, proximity radar vigilance, and idle reduction.',
    checklist: [
      'Fastened seatbelt prior to disengaging hydraulic lock lever',
      'Maintained active scanning of 360° proximity radar during swing cycles',
      'Shut engine down during extended truck queue delays',
    ],
    quiz: [
      {
        question: 'Why do safety lapses and excessive idling often occur in the same operational shift?',
        options: ['Coincidence', 'Unfocused downtime between tasks causes attention drops', 'Machine computer glitches', 'Cold weather'],
        correctIndex: 1,
        explanation: 'Cross-feature telemetry analysis shows idle downtime is when operators tend to unfasten seatbelts or miss proximity blind spots.',
      },
    ],
    content: `### 1. Root Cause of Combined Infractions
Telemetry indicates that idling with the machine unattended or unfocused is often when seatbelt and proximity lapses happen too. Start every session with a seatbelt check before engaging any control.

### 2. Active Radar Discipline
Treat the proximity radar as an active tool, not a passive alert: glance at it before every directional move, not just when it sounds.

### 3. Idle Reduction
If you are idling for more than a couple of minutes between tasks, shut the engine down rather than leaving it running unattended. This cuts idling time and eliminates unmonitored risk windows.`,
  },

  // -------------------------------------------------------------
  // 2. E-LEARNING VIDEO MASTERCLASSES
  // -------------------------------------------------------------
  {
    moduleId: 'TH005',
    title: 'Video Masterclass: CAT Next Gen Quick-Coupler Operations',
    format: 'video',
    category: 'Equipment Mastery',
    durationMin: 6,
    videoDuration: '05:42',
    completionStatus: 'In Progress',
    lastReviewed: '2026-09-21',
    summary: 'Step-by-step video demonstration of hydraulic attachment locking, visual pin verification, and pressure relief.',
    videoPoster: 'quick_coupler_demo',
    chapters: [
      { time: '00:00', title: 'Introduction & Cab Safety Lock Engaged' },
      { time: '01:15', title: 'Engaging Wedge Lock & Hydraulic Verification' },
      { time: '03:10', title: 'Visual Ground Test & Bucket Curl Validation' },
      { time: '04:45', title: 'Emergency Quick Release & Fail-Safe Protocols' },
    ],
    transcript: 'In this video masterclass, senior CAT field engineer demonstrates the proper hydraulic coupling protocol for the CAT 336 excavator. Always confirm the visual safety pin lock before applying high breakout torque. Step 1: Lower attachment to stable ground. Step 2: Relieve auxiliary line pressure. Step 3: Engage coupler wedge switch and verify dual visual locking pins.',
    quiz: [
      {
        question: 'What physical verification must always be performed after engaging a quick-coupler?',
        options: ['Rapid boom swing', 'Visual check of dual locking pins & ground crowd test', 'Full throttle acceleration', 'No verification needed'],
        correctIndex: 1,
        explanation: 'Visual verification of the green locking pin engagement combined with a gentle ground curl test ensures total hydraulic security.',
      },
    ],
  },
  {
    moduleId: 'TH006',
    title: 'Video Field Drill: 360° Cab Blind Spot & Radar Management',
    format: 'video',
    category: 'Safety Compliance',
    durationMin: 8,
    videoDuration: '07:15',
    completionStatus: 'Not Started',
    lastReviewed: null,
    summary: 'Mastering the in-cab proximity radar, mirror adjustments, and multi-camera split screen for tight site zones.',
    videoPoster: 'proximity_video_demo',
    chapters: [
      { time: '00:00', title: 'Pre-Shift Camera & Ultrasonic Sensor Check' },
      { time: '02:00', title: 'Interpreting the 3.0m Radar Danger Envelope' },
      { time: '04:30', title: 'Spotter Hand Signals & Radio Protocol' },
      { time: '06:10', title: 'Night Shift & Low Visibility Operations' },
    ],
    transcript: 'Proper radar interpretation prevents side-swipe collisions with support vehicles and ground personnel. When proximity sounds within 3.0m, bring hydraulic controls to neutral immediately. Ensure ultrasonic sensor heads are cleaned of mud before starting shift.',
    quiz: [
      {
        question: 'When the in-cab radar displays a red blip within 3.0m, what is the immediate required operator action?',
        options: ['Speed up to finish cut', 'Bring hydraulic joysticks to neutral and sound horn', 'Ignore if in daytime', 'Turn off radar sensor'],
        correctIndex: 1,
        explanation: 'Bringing controls to neutral instantly stops all machine travel and swing momentum, preventing perimeter collisions.',
      },
    ],
  },
  {
    moduleId: 'TH011',
    title: 'Video Masterclass: Precision Grade Control & 3D GPS Guidance',
    format: 'video',
    category: 'Machine Guidance',
    durationMin: 9,
    videoDuration: '08:30',
    completionStatus: 'Not Started',
    lastReviewed: null,
    summary: 'Calibrating Caterpillar Grade 3D GPS antennas, benchmark elevation offsets, and automated boom assist.',
    videoPoster: 'grade_control_demo',
    chapters: [
      { time: '00:00', title: 'GPS Base Station Lock & RTK Calibration' },
      { time: '02:30', title: 'Benchmarking Bucket Cutting Edge on Site Survey Peg' },
      { time: '05:00', title: 'Engaging CAT Grade Auto-Boom Assist' },
      { time: '07:15', title: 'Tolerances & Cross-Slope Fine-Tuning' },
    ],
    transcript: 'Caterpillar Grade 3D eliminates stakes and manual grade checkers. By configuring bucket cutting edge coordinates against the site design model, automated boom assist prevents over-digging and cuts earthmoving cycle times by up to 35%.',
    quiz: [
      {
        question: 'How does CAT Grade 3D Auto-Boom Assist reduce cycle times?',
        options: ['Increases engine top speed', 'Automatically maintains bucket grade without over-digging', 'Digs randomly', 'Bypasses hydraulic limits'],
        correctIndex: 1,
        explanation: 'Auto-boom assist guides the bucket cutting edge precisely along design elevations, eliminating manual rework and over-digging.',
      },
    ],
  },
  {
    moduleId: 'TH012',
    title: 'Video Masterclass: High-Efficiency Heavy Haul Truck Loading',
    format: 'video',
    category: 'Efficiency & Eco-Drive',
    durationMin: 7,
    videoDuration: '06:20',
    completionStatus: 'Completed',
    lastReviewed: '2026-09-19',
    summary: 'Optimal bench height, swing angle minimization (<60°), and 4-pass loading matching for CAT 745 articulated trucks.',
    videoPoster: 'haul_loading_demo',
    chapters: [
      { time: '00:00', title: 'Excavator Bench Setup & Truck Spotting' },
      { time: '01:45', title: 'Achieving Optimal 45°-60° Swing Angle' },
      { time: '03:30', title: 'Bucket Fill Factor & Center-Body Loading' },
      { time: '05:10', title: 'Signaling Truck Dispatch & Safety Clearance' },
    ],
    transcript: 'Efficient mass excavation depends on swing angle minimization. Keeping your swing angle below 60 degrees saves up to 4 seconds per pass, resulting in over 120 extra tons moved per hour with zero extra fuel burn.',
    quiz: [
      {
        question: 'What is the target maximum swing angle for high-efficiency mass excavation loading?',
        options: ['45° to 60°', '90° to 120°', '180°', '360°'],
        correctIndex: 0,
        explanation: 'Keeping the excavator swing angle under 60° drastically cuts hydraulic travel time per bucket pass.',
      },
    ],
  },

  // -------------------------------------------------------------
  // 3. INTERACTIVE CAB SIMULATION MODULES
  // -------------------------------------------------------------
  {
    moduleId: 'TH007',
    title: 'Simulation Module: Trench Benching Angle & Soil Stability',
    format: 'simulation',
    category: 'Interactive Simulation',
    durationMin: 12,
    completionStatus: 'In Progress',
    lastReviewed: '2026-09-23',
    summary: 'Interactive cab simulator: adjust slope benching angles and excavator setback distances across Type A, B, and C soils.',
    simulationType: 'soil_stability',
  },
  {
    moduleId: 'TH008',
    title: 'Simulation Module: In-Cab Proximity Clearance & Reaction Drill',
    format: 'simulation',
    category: 'Interactive Simulation',
    durationMin: 10,
    completionStatus: 'Not Started',
    lastReviewed: null,
    summary: 'Interactive radar hazard drill: scan radar quadrants, identify approaching obstacles, and execute emergency cutoff.',
    simulationType: 'proximity_hazard',
  },
  {
    moduleId: 'TH013',
    title: 'Simulation Module: Eco-Power Mode & Hydraulic Load Balancer',
    format: 'simulation',
    category: 'Interactive Simulation',
    durationMin: 10,
    completionStatus: 'Not Started',
    lastReviewed: null,
    summary: 'Balance engine RPM vs main hydraulic pump displacement to achieve maximum breakout power with minimum DEF fuel burn.',
    simulationType: 'load_balancer',
  },

  // -------------------------------------------------------------
  // 4. INSTRUCTOR 1-ON-1 COACHING & CERTIFIED AUDITS
  // -------------------------------------------------------------
  {
    moduleId: 'TH009',
    title: 'Instructor Booking: 1-on-1 Certified Master Operator Review',
    format: 'instructor',
    category: 'Instructor Coaching',
    durationMin: 30,
    completionStatus: 'Not Started',
    lastReviewed: null,
    summary: 'Schedule a live 30-minute virtual or on-site coaching session with a CAT Certified Master Instructor for feedback and skill elevation.',
    instructor: {
      name: 'Sarah Jenkins',
      title: 'Senior Field Operator Specialist, CAT Global Training',
      rating: '4.9/5.0 (184 Reviews)',
      avatar: 'SJ',
      availableSlots: ['Today 16:00', 'Tomorrow 09:30', 'Tomorrow 14:00', 'Friday 11:00'],
    },
  },
  {
    moduleId: 'TH014',
    title: 'Site Safety Audit & Precision Assessment with Marcus Vance',
    format: 'instructor',
    category: 'Instructor Coaching',
    durationMin: 30,
    completionStatus: 'Not Started',
    lastReviewed: null,
    summary: 'Comprehensive audit session covering recent telemetry logs, proximity alerts, and personalized trenching safety plans.',
    instructor: {
      name: 'Marcus Vance',
      title: 'Lead Safety Compliance Auditor • Caterpillar MineStar Operations',
      rating: '4.95/5.0 (212 Reviews)',
      avatar: 'MV',
      availableSlots: ['Today 17:30', 'Tomorrow 11:00', 'Thursday 15:00'],
    },
  },
  {
    moduleId: 'TH018',
    title: 'Eco-Drive & Fuel Optimization Clinic with David Chen',
    format: 'instructor',
    category: 'Instructor Coaching',
    durationMin: 30,
    completionStatus: 'Not Started',
    lastReviewed: null,
    summary: 'Analyze your machine duty cycles, idle time distribution, and electronic throttle calibration with a Caterpillar powertrain expert.',
    instructor: {
      name: 'David Chen',
      title: 'Senior Powertrain & Telematics Specialist • CAT Equipment Technology',
      rating: '4.88/5.0 (96 Reviews)',
      avatar: 'DC',
      availableSlots: ['Tomorrow 08:30', 'Tomorrow 16:30', 'Friday 13:00'],
    },
  },
];

export const TELEMETRY_HISTORY = [
  { time: '08:00', fuelUsed: 4.2, idlingMin: 8, loadCycles: 12, engineTemp: 82 },
  { time: '09:00', fuelUsed: 11.5, idlingMin: 18, loadCycles: 28, engineTemp: 88 },
  { time: '10:00', fuelUsed: 19.8, idlingMin: 32, loadCycles: 44, engineTemp: 91 },
  { time: '11:00', fuelUsed: 26.4, idlingMin: 48, loadCycles: 55, engineTemp: 94 },
  { time: '12:00', fuelUsed: 31.0, idlingMin: 52, loadCycles: 61, engineTemp: 89 },
  { time: '13:00', fuelUsed: 38.2, idlingMin: 55, loadCycles: 74, engineTemp: 92 },
];

/**
 * Deterministic Task Time Predictor (Mirrors the exact rules in CONTRACTS.md §4 & §B)
 * Used as high-fidelity fallback and instant prediction engine
 */
export function calculateTaskTimePrediction({
  taskType = 'Earth Excavation',
  weather = 'Sunny',
  operatorSkill = 'Intermediate',
  machineAgeYears = 3,
  estimatedTimeMin = 60,
  forceModelMode = true,
}) {
  let multiplier = 1.0;

  // Skill multiplier
  if (operatorSkill === 'Beginner') multiplier *= 1.25;
  else if (operatorSkill === 'Intermediate') multiplier *= 1.04;
  else if (operatorSkill === 'Expert') multiplier *= 0.92;

  // Weather multiplier
  if (weather === 'Rainy' || weather === 'Windy') {
    multiplier *= 1.12;
  }

  // Machine age multiplier
  if (Number(machineAgeYears) > 5) {
    multiplier *= 1.08;
  }

  // Task-specific nuance
  if (taskType === 'Demolition' && weather === 'Windy') {
    multiplier *= 1.05;
  }

  const rawPredicted = Number(estimatedTimeMin) * multiplier;
  const predictedTimeMin = Math.round(rawPredicted * 10) / 10;

  return {
    predictedTimeMin,
    source: forceModelMode ? 'model' : 'fallback_average',
    confidence: forceModelMode ? (operatorSkill === 'Expert' ? 'high' : 'medium') : 'low',
    deltaMin: Math.round((predictedTimeMin - Number(estimatedTimeMin)) * 10) / 10,
    deltaPct: Math.round(((predictedTimeMin - Number(estimatedTimeMin)) / Number(estimatedTimeMin)) * 100),
  };
}
