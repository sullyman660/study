/**
 * 篝火：被遗忘的土地 - 网页版
 * The Bonfire: Forsaken Lands - Web Version
 * 
 * 核心游戏逻辑
 */

// ==================== 游戏配置 ====================
const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 450,
    GROUND_Y: 320,
    DAY_DURATION: 180, // 游戏内一天的真实秒数（3分钟一天，白天约1.5分钟）
    DAY_START_HOUR: 6,
    NIGHT_START_HOUR: 18,
    
    // 资源产出
    WOOD_PER_CHOP: 2,
    FOOD_PER_HUNT: 2,
    FOOD_PER_FARM: 1,
    
    // 消耗
    FOOD_CONSUMPTION_PER_WORKER: 0.5,
    
    // 建筑定义（含解锁条件）
    BUILDINGS: {
        tent: { 
            wood: 10, food: 0,
            name: '帐篷',
            desc: '为1个工人提供住所',
            unlockDay: 1,
            unlockCondition: null
        },
        farm: { 
            wood: 15, food: 0,
            name: '农场',
            desc: '自动生产食物',
            unlockDay: 2,
            unlockCondition: null
        },
        wall: { 
            wood: 20, food: 0,
            name: '木墙',
            desc: '防御怪物攻击',
            unlockDay: 3,
            unlockCondition: null
        },
        watchtower: { 
            wood: 30, food: 5,
            name: '瞭望塔',
            desc: '提前发现敌人，增加守卫视野',
            unlockDay: 4,
            unlockCondition: null
        },
        workshop: {
            wood: 40, food: 10,
            name: '工坊',
            desc: '解锁高级制作（铁剑、皮甲）',
            unlockDay: 5,
            unlockCondition: null
        },
        shipyard: {
            wood: 50, food: 20,
            name: '船坞',
            desc: '建造船只，探索新大陆',
            unlockDay: 6,
            unlockCondition: () => Game.craftedItems.includes('boat') || Game.workers.length >= 5
        }
    },
    
    // 敌人生成
    ENEMY_SPAWN_RATE: 0.3, // 夜晚每秒生成概率
    
    // 颜色
    COLORS: {
        skyDay: ['#87CEEB', '#B0E0E6'],
        skyNight: ['#0a0a2e', '#1a1a3e'],
        ground: '#F0F0F0',
        groundDark: '#E0E0E0',
        bonfireOuter: '#FF6B35',
        bonfireInner: '#FFD93D',
        bonfireCore: '#FFFFFF',
        treeTrunk: '#8B4513',
        treeLeaves: ['#228B22', '#2E8B57', '#006400'],
        worker: '#4169E1',
        workerGuard: '#DC143C',
        enemy: '#8B0000',
        snow: '#FFFFFF'
    },

    // 雪花粒子
    SNOW: {
        COUNT: 40,
        SPEED_MIN: 0.3,
        SPEED_MAX: 1.5,
        WIND_SPEED: 0.5
    },

    // 屏幕震动
    SHAKE: {
        INTENSITY: 3,
        DECAY: 0.9
    },
    
    // 制作配方
    CRAFT_RECIPES: {
        bow: { wood: 20, food: 5, name: '弓', crafted: false },
        sword: { wood: 15, food: 10, name: '铁剑', crafted: false },
        armor: { wood: 25, food: 15, name: '皮甲', crafted: false },
        torch: { wood: 5, food: 0, name: '火把', crafted: false },
        boat: { wood: 50, food: 20, name: '小船', crafted: false }
    },
    
    // 探索区域
    REGIONS: {
        camp: { name: '营地', discovered: true, desc: '你的定居点' },
        forest: { name: '迷雾森林', discovered: false, desc: '茂密的森林，资源丰富' },
        mountain: { name: '雪山', discovered: false, desc: '高耸的雪山，危险重重' },
        dungeon: { name: '古代地下城', discovered: false, desc: '远古文明的遗迹' },
        shore: { name: '海岸', discovered: false, desc: '大海的边缘' },
        newland: { name: '新大陆', discovered: false, desc: '传说中的新大陆' }
    },
    
    // 随机事件
    EVENTS: [
        {
            id: 'traveler',
            title: '流浪旅人',
            desc: '一个疲惫的旅人来到你的营地，他看起来饥饿而疲惫。',
            condition: () => Game.day >= 3 && Game.isDay,
            choices: [
                { text: '给他食物（-5食物）', action: () => { 
                    if (Game.resources.food >= 5) {
                        Game.resources.food -= 5;
                        showMessage('旅人感激地离开了，留下一些木材作为回报。');
                        Game.resources.wood += 10;
                    } else {
                        showMessage('食物不足，无法帮助旅人。');
                    }
                }},
                { text: '让他离开', action: () => { 
                    showMessage('旅人默默离开了。');
                }}
            ]
        },
        {
            id: 'ancient_ruins',
            title: '古代遗迹',
            desc: '你的侦察兵发现了一处古代遗迹，里面似乎藏着什么秘密。',
            condition: () => Game.discoveredRegions.includes('forest') && Math.random() < 0.3,
            choices: [
                { text: '探索遗迹', action: () => { 
                    showMessage('你发现了一块古代石碑，上面记载着远古泰坦的传说...');
                    Game.storyProgress = Math.max(Game.storyProgress, 1);
                }},
                { text: '暂时不探索', action: () => { 
                    showMessage('你决定等准备更充分后再来探索。');
                }}
            ]
        },
        {
            id: 'merchant',
            title: '商人',
            desc: '一位商人路过你的营地，他带着各种商品。',
            condition: () => Game.day >= 5 && Game.isDay && Game.discoveredRegions.includes('shore'),
            choices: [
                { text: '用10木材换15食物', action: () => { 
                    if (Game.resources.wood >= 10) {
                        Game.resources.wood -= 10;
                        Game.resources.food += 15;
                        showMessage('交易成功！');
                    } else {
                        showMessage('木材不足。');
                    }
                }},
                { text: '不交易', action: () => { 
                    showMessage('商人继续上路了。');
                }}
            ]
        },
        {
            id: 'monster_raid',
            title: '怪物袭击！',
            desc: '一群怪物在白天偷袭了你的营地！',
            condition: () => !Game.isDay && Game.day > 2,
            choices: [
                { text: '组织防御', action: () => { 
                    showMessage('守卫们奋勇抵抗！');
                    // 额外生成2个敌人
                    for (let i = 0; i < 2; i++) {
                        spawnEnemies(1);
                    }
                }}
            ]
        },
        {
            id: 'mysterious_scroll',
            title: '神秘卷轴',
            desc: '在地下城的深处，你发现了一份古老的卷轴。',
            condition: () => Game.discoveredRegions.includes('dungeon') && Math.random() < 0.2,
            choices: [
                { text: '解读卷轴', action: () => { 
                    showMessage('卷轴记载了解放远古泰坦的方法！你的目标是找到远古神庙。');
                    Game.storyProgress = Math.max(Game.storyProgress, 2);
                    Game.resources.wood += 20;
                }},
                { text: '收起卷轴', action: () => { 
                    showMessage('你把卷轴收好，留待日后研究。');
                }}
            ]
        }
    ]
};

// ==================== 游戏状态 ====================
const Game = {
    day: 1,
    time: 6.0,
    isDay: true,
    gameOver: false,
    paused: false,
    
    resources: {
        wood: 30,
        food: 20
    },
    
    workers: [],
    buildings: [],
    enemies: [],
    particles: [],
    
    // 篝火状态
    bonfire: {
        x: 400,
        y: CONFIG.GROUND_Y - 20,
        intensity: 1.0,
        frame: 0
    },
    
    // 树木（可采集资源点）
    trees: [],
    
    // 游戏速度
    speed: 1.0,
    
    // 时间流逝速度（游戏小时/真实秒）
    timeSpeed: 24 / CONFIG.DAY_DURATION,
    
    // 制作系统
    craftedItems: [],
    
    // 探索系统
    discoveredRegions: ['camp'],
    selectedRegion: null,
    exploreLog: [],
    
    // 剧情进度
    storyProgress: 0, // 0: 开始, 1: 发现遗迹, 2: 找到卷轴, 3: 解放泰坦, 4: 击败觉醒者
    
    // 事件冷却
    eventCooldown: 0,
    
    // 泰坦
    titan: {
        freed: false,
        hp: 100,
        maxHp: 100
    },

    // 雪花粒子
    snowflakes: [],

    // 屏幕震动
    shake: {
        x: 0,
        y: 0,
        intensity: 0
    },

    // 敌人类型配置
    ENEMY_TYPES: [
        { name: '哥布林', color: '#556B2F', speed: 25, hp: 15, damage: 3, minDay: 1 },
        { name: '骷髅', color: '#FFFFF0', speed: 20, hp: 25, damage: 5, minDay: 3 },
        { name: '暗影', color: '#4B0082', speed: 35, hp: 30, damage: 7, minDay: 5 },
        { name: '巨魔', color: '#8B4513', speed: 15, hp: 50, damage: 10, minDay: 8 }
    ]
};

// ==================== 初始化 ====================
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

function initGame() {
    // 初始化树木
    for (let i = 0; i < 8; i++) {
        Game.trees.push({
            x: 50 + Math.random() * 250 + (i < 4 ? 0 : 450),
            y: CONFIG.GROUND_Y - 10,
            height: 40 + Math.random() * 30,
            width: 15 + Math.random() * 10,
            hasWood: true,
            regrowTime: 0
        });
    }
    
    // 初始工人（僧侣）
    addWorker('monk', '僧侣');
    
    // 初始化事件监听
    initUI();
    initPrologue();

    // 初始化UI状态
    updateCraftButtons();
    updateMapUI();
    
    // 尝试加载存档
    if (hasSave()) {
        setTimeout(() => {
            if (confirm('检测到存档，是否继续上次的游戏？')) {
                loadGame();
            }
        }, 500);
    }
    
    // 开始游戏循环
    requestAnimationFrame(gameLoop);

    // 初始化雪花粒子
    for (let i = 0; i < CONFIG.SNOW.COUNT; i++) {
        Game.snowflakes.push({
            x: Math.random() * CONFIG.CANVAS_WIDTH,
            y: Math.random() * CONFIG.CANVAS_HEIGHT,
            size: 1 + Math.random() * 3,
            speed: CONFIG.SNOW.SPEED_MIN + Math.random() * (CONFIG.SNOW.SPEED_MAX - CONFIG.SNOW.SPEED_MIN),
            opacity: 0.3 + Math.random() * 0.5,
            wobble: Math.random() * Math.PI * 2
        });
    }

    // 显示欢迎消息
    showMessage('欢迎来到被遗忘的土地...点燃篝火，生存下去！');

    // 首次交互初始化音频
    const initAudio = () => {
        SFX.init();
        SFX.startBonfireAmbience();
        SFX.setDayNight(Game.isDay);
        document.removeEventListener('click', initAudio);
        document.removeEventListener('keydown', initAudio);
    };
    document.addEventListener('click', initAudio);
    document.addEventListener('keydown', initAudio);
}

// ==================== 工人系统 ====================
function addWorker(type, name) {
    // 是否是外部新来的流浪者
    const isNewWanderer = (type === 'wanderer');

    const worker = {
        id: Game.workers.length,
        type: type,
        name: name || `工人${Game.workers.length + 1}`,
        job: type === 'monk' ? '僧侣' : '流浪者',
        state: isNewWanderer ? 'arriving' : 'idle',
        x: isNewWanderer ? (Math.random() < 0.5 ? -30 : CONFIG.CANVAS_WIDTH + 30) : (Game.bonfire.x + (Math.random() - 0.5) * 60),
        y: CONFIG.GROUND_Y - 15,
        targetX: isNewWanderer ? (Game.bonfire.x + (Math.random() - 0.5) * 80) : null,
        targetY: null,
        workTimer: 0,
        hasFood: true,
        equipped: null
    };
    Game.workers.push(worker);
    updateUI();

    // 只有新工人（不是初始僧侣或加载存档时的工人）才播放音效
    if (Game.workers.length > 1 && !Game.loadingSave) {
        SFX.playRecruit();
    }
    return worker;
}

function assignJob(workerId, job) {
    const worker = Game.workers.find(w => w.id === workerId);
    if (!worker) return;
    
    const jobNames = {
        logger: '伐木工',
        hunter: '猎人',
        guard: '守卫',
        farmer: '农民'
    };
    
    worker.job = jobNames[job] || job;
    worker.assignedJob = job;
    showMessage(`${worker.name} 成为了 ${worker.job}`);
    updateUI();
}

// ==================== 建筑系统 ====================
function buildStructure(type) {
    const buildingDef = CONFIG.BUILDINGS[type];
    if (!buildingDef) return false;
    
    // Check unlock condition
    if (Game.day < buildingDef.unlockDay) {
        showMessage(`${buildingDef.name} 需要第 ${buildingDef.unlockDay} 天才能解锁！`);
        SFX.playError();
        return false;
    }
    if (buildingDef.unlockCondition && !buildingDef.unlockCondition()) {
        showMessage(`条件不足，无法建造 ${buildingDef.name}！`);
        SFX.playError();
        return false;
    }
    
    const cost = { wood: buildingDef.wood, food: buildingDef.food };
    
    // 检查资源
    if (Game.resources.wood < (cost.wood || 0)) {
        showMessage('木材不足！');
        SFX.playError();
        return false;
    }
    if (Game.resources.food < (cost.food || 0)) {
        showMessage('食物不足！');
        SFX.playError();
        return false;
    }
    
    // 扣除资源
    Game.resources.wood -= (cost.wood || 0);
    Game.resources.food -= (cost.food || 0);
    
    // 创建建筑
    const building = {
        type: type,
        x: 100 + Math.random() * 600,
        y: CONFIG.GROUND_Y - 10,
        level: 1,
        built: true
    };
    
    // 确保不与其他建筑重叠
    let attempts = 0;
    while (attempts < 20) {
        let overlap = false;
        for (const b of Game.buildings) {
            if (Math.abs(b.x - building.x) < 60) {
                overlap = true;
                break;
            }
        }
        if (!overlap) break;
        building.x = 100 + Math.random() * 600;
        attempts++;
    }
    
    Game.buildings.push(building);
    
    const buildNames = {
        tent: '帐篷',
        farm: '农场',
        wall: '木墙',
        watchtower: '瞭望塔',
        workshop: '工坊',
        shipyard: '船坞'
    };
    
    showMessage(`建造完成：${buildNames[type]}`);
    SFX.playBuild();
    updateUI();
    
    // 建造特效
    for (let i = 0; i < 10; i++) {
        Game.particles.push({
            x: building.x,
            y: building.y - 20,
            vx: (Math.random() - 0.5) * 4,
            vy: -Math.random() * 3 - 1,
            life: 1.0,
            color: '#FFD700',
            size: 3
        });
    }
    
    return true;
}

// ==================== 游戏逻辑更新 ====================
let lastTime = 0;
let accumulator = 0;
const FIXED_TIME_STEP = 1 / 60;

function gameLoop(timestamp) {
    if (Game.gameOver) return;
    
    const deltaTime = lastTime ? (timestamp - lastTime) / 1000 : FIXED_TIME_STEP;
    lastTime = timestamp;
    
    accumulator += deltaTime;
    
    while (accumulator >= FIXED_TIME_STEP) {
        update(FIXED_TIME_STEP);
        accumulator -= FIXED_TIME_STEP;
    }
    
    render();
    updateQuest();
    requestAnimationFrame(gameLoop);
}

function update(dt) {
    if (Game.paused) return;
    
    const scaledDt = dt * Game.speed;
    
    // 更新时间
    Game.time += scaledDt * Game.timeSpeed;
    
    // 检查昼夜切换
    const wasDay = Game.isDay;
    Game.isDay = Game.time >= CONFIG.DAY_START_HOUR && Game.time < CONFIG.NIGHT_START_HOUR;
    
    if (wasDay && !Game.isDay) {
        // 进入夜晚
        showMessage('夜幕降临...怪物即将出现！');
        onNightStart();
    } else if (!wasDay && Game.isDay) {
        // 进入白天
        Game.day++;
        showMessage(`第 ${Game.day} 天开始了`);
        onDayStart();
    }
    
    // 时间循环
    if (Game.time >= 24) {
        Game.time = 0;
    }
    
    // 更新篝火
    Game.bonfire.frame += scaledDt * 10;
    Game.bonfire.intensity = 0.8 + Math.sin(Game.bonfire.frame * 0.5) * 0.2;
    
    // 更新工人
    updateWorkers(scaledDt);
    
    // 更新敌人
    updateEnemies(scaledDt);
    
    // 更新粒子
    updateParticles(scaledDt);

    // 更新雪花
    updateSnowflakes(scaledDt);
    
    // 夜晚生成敌人
    if (!Game.isDay) {
        spawnEnemies(scaledDt);
    }
    
    // 食物消耗
    consumeFood(scaledDt);
    
    // 农场生产
    produceFromFarms(scaledDt);
    
    // 树木再生
    regrowTrees(scaledDt);
    
    // 事件冷却
    if (Game.eventCooldown > 0) {
        Game.eventCooldown -= scaledDt;
    }
    
    // 随机触发事件（白天概率较低，夜晚概率较高）
    if (Game.eventCooldown <= 0 && Math.random() < 0.001) {
        triggerRandomEvent();
    }

    // 更新任务
    updateQuest();

    // 更新UI
    updateUI();
}

function onDayStart() {
    // 白天开始：所有工人恢复工作状态
    Game.enemies = []; // 清除剩余敌人
    
    for (const worker of Game.workers) {
        // 所有非战斗状态都重置为idle，确保工人白天能正常工作
        if (worker.state === 'fighting' || worker.state === 'resting' || worker.state === 'returning' || worker.state === 'guarding') {
            worker.state = 'idle';
        }
        // 清除残留的目标位置
        worker.targetX = null;
        worker.targetTree = null;
    }
    SFX.playDawn();
    SFX.setDayNight(true);
}

function onNightStart() {
    // 夜晚开始：非守卫工人回篝火
    for (const worker of Game.workers) {
        if (worker.assignedJob !== 'guard' && worker.type !== 'monk') {
            worker.state = 'returning';
            worker.targetX = Game.bonfire.x + (Math.random() - 0.5) * 80;
        } else if (worker.assignedJob === 'guard') {
            worker.state = 'guarding';
        }
    }
    SFX.playNightfall();
    SFX.setDayNight(false);
    triggerShake(2);
}

function updateWorkers(dt) {
    for (const worker of Game.workers) {
        // 白天工作逻辑
        if (Game.isDay && worker.state !== 'fighting') {
            if (worker.assignedJob === 'logger' && worker.state === 'idle') {
                // 找树去砍
                const tree = findNearestTree(worker.x);
                if (tree && tree.hasWood) {
                    worker.state = 'moving_to_work';
                    worker.targetX = tree.x;
                    worker.targetTree = tree;
                }
            } else if (worker.assignedJob === 'hunter' && worker.state === 'idle') {
                // 猎人随机移动"狩猎"
                if (Math.random() < 0.01) {
                    worker.state = 'working';
                    worker.workTimer = 3;
                }
            } else if (worker.assignedJob === 'farmer') {
                // 农民去农场
                const farm = Game.buildings.find(b => b.type === 'farm');
                if (farm && worker.state === 'idle') {
                    worker.state = 'moving_to_work';
                    worker.targetX = farm.x;
                }
            }
        }
        
        // 移动逻辑
        if (worker.targetX !== null && worker.state !== 'fighting') {
            const dx = worker.targetX - worker.x;
            const speed = 40 * dt;
            
            if (Math.abs(dx) > speed) {
                worker.x += Math.sign(dx) * speed;
            } else {
                worker.x = worker.targetX;
                worker.targetX = null;
                
                if (worker.state === 'moving_to_work') {
                    worker.state = 'working';
                    worker.workTimer = 2;
                } else if (worker.state === 'returning') {
                    worker.state = 'resting';
                } else if (worker.state === 'arriving') {
                    worker.state = 'idle';
                    showMessage(`${worker.name} 到达了营地！`);
                }
            }
        }
        
        // 工作逻辑
        if (worker.state === 'working') {
            worker.workTimer -= dt;
            
            if (worker.workTimer <= 0) {
                // 完成工作，产出资源
                // Monk work completion
                if (worker.type === 'monk' && worker.targetTree) {
                    if (worker.targetTree.hasWood) {
                        Game.resources.wood += CONFIG.WOOD_PER_CHOP;
                        worker.targetTree.hasWood = false;
                        worker.targetTree.regrowTime = 30;
                        showMessage('僧侣采集了木材');
                        SFX.playWoodCollect();
                        SFX.playChop();
                        
                        // Chop particles
                        for (let i = 0; i < 8; i++) {
                            Game.particles.push({
                                x: worker.x,
                                y: worker.y - 20,
                                vx: (Math.random() - 0.5) * 5,
                                vy: -Math.random() * 3,
                                life: 1,
                                color: '#8B4513',
                                size: 4
                            });
                        }
                    }
                    worker.targetTree = null;
                } else if (worker.assignedJob === 'logger' && worker.targetTree) {
                    if (worker.targetTree.hasWood) {
                        Game.resources.wood += CONFIG.WOOD_PER_CHOP;
                        worker.targetTree.hasWood = false;
                        worker.targetTree.regrowTime = 30;
                        showMessage(`${worker.name} 采集了木材`);
                        SFX.playWoodCollect();
                        
                        // 采集粒子
                        Game.particles.push({
                            x: worker.x,
                            y: worker.y - 20,
                            vx: 0,
                            vy: -2,
                            life: 1,
                            color: '#8B4513',
                            size: 4
                        });
                    }
                    worker.targetTree = null;
                } else if (worker.type === 'monk') {
                    // Monk farming or general work
                    Game.resources.food += CONFIG.FOOD_PER_FARM;
                    showMessage('僧侣收获了食物');
                    SFX.playFoodCollect();
                    
                    // Harvest particles
                    for (let i = 0; i < 6; i++) {
                        Game.particles.push({
                            x: worker.x,
                            y: worker.y - 15,
                            vx: (Math.random() - 0.5) * 3,
                            vy: -Math.random() * 2,
                            life: 1,
                            color: '#228B22',
                            size: 3
                        });
                    }
                } else if (worker.assignedJob === 'hunter') {
                    Game.resources.food += CONFIG.FOOD_PER_HUNT;
                    showMessage(`${worker.name} 狩猎获得食物`);
                    SFX.playFoodCollect();
                } else if (worker.assignedJob === 'farmer') {
                    // 农民在农场工作，由农场统一产出
                }
                
                worker.state = 'idle';
            }
        }
        
        // 守卫战斗逻辑
        if (worker.assignedJob === 'guard' && !Game.isDay) {
            // 寻找最近的敌人（全画布检测）
            let nearestEnemy = null;
            let nearestDist = Infinity;
            
            for (const enemy of Game.enemies) {
                const dist = Math.abs(enemy.x - worker.x);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestEnemy = enemy;
                }
            }
            
            if (nearestEnemy) {
                worker.state = 'fighting';
                
                // 计算攻击距离和伤害
                let attackRange = 30;
                let damage = 10;
                
                if (worker.hasBow) {
                    attackRange = 180; // 弓可以远程攻击
                    damage = 8;
                }
                if (worker.hasSword) {
                    damage = 20; // 剑伤害更高
                }
                
                // 向敌人移动
                const dx = nearestEnemy.x - worker.x;
                if (Math.abs(dx) > attackRange) {
                    worker.x += Math.sign(dx) * 60 * dt; // 更快的追击速度
                } else {
                    // 攻击
                    nearestEnemy.hp -= dt * damage;
                    
                    // 攻击粒子
                    const particleColor = worker.hasSword ? '#FFD700' : '#FF0000';
                    if (Math.random() < 0.3) {
                        SFX.playAttack();
                        Game.particles.push({
                            x: nearestEnemy.x,
                            y: nearestEnemy.y - 15,
                            vx: (Math.random() - 0.5) * 4,
                            vy: -Math.random() * 2,
                            life: 0.5,
                            color: particleColor,
                            size: worker.hasSword ? 5 : 3
                        });
                    }
                    
                    // 弓的箭矢效果
                    if (worker.hasBow && Math.abs(dx) > 40) {
                        SFX.playArrow();
                        Game.particles.push({
                            x: worker.x + Math.sign(dx) * 20,
                            y: worker.y - 25,
                            vx: Math.sign(dx) * 10,
                            vy: 0,
                            life: 0.3,
                            color: '#8B4513',
                            size: 2
                        });
                    }
                }
            } else {
                worker.state = 'guarding';
                // 守卫主动巡逻，覆盖篝火两侧
                const guardIndex = Game.workers.filter(w => w.assignedJob === 'guard').indexOf(worker);
                const patrolOffset = (guardIndex % 2 === 0 ? 1 : -1) * 120;
                const patrolX = Game.bonfire.x + patrolOffset + Math.sin(Game.time * 2 + guardIndex) * 50;
                const dx = patrolX - worker.x;
                if (Math.abs(dx) > 5) {
                    worker.x += Math.sign(dx) * 40 * dt;
                }
            }
        }
        
        // 僧侣逻辑（玩家角色）- 可以执行所有工作
        if (worker.type === 'monk') {
            // 如果设置了目标位置，则移动过去
            if (worker.targetX !== null) {
                const dx = worker.targetX - worker.x;
                const speed = 70 * dt; // 僧侣移动更快
                if (Math.abs(dx) > speed) {
                    worker.x += Math.sign(dx) * speed;
                    worker.state = 'moving_to_work';
                } else {
                    worker.x = worker.targetX;
                    worker.targetX = null;
                    
                    // Check what's at this location and do work
                    const nearbyTree = Game.trees.find(t => 
                        t.hasWood && Math.abs(t.x - worker.x) < 30
                    );
                    const nearbyBuilding = Game.buildings.find(b => 
                        b.type === 'farm' && Math.abs(b.x - worker.x) < 40
                    );
                    
                    if (nearbyTree) {
                        // Chop tree
                        worker.state = 'working';
                        worker.workTimer = 1.5;
                        worker.targetTree = nearbyTree;
                        showMessage('僧侣开始伐木...');
                    } else if (nearbyBuilding) {
                        // Farm work
                        worker.state = 'working';
                        worker.workTimer = 2;
                        showMessage('僧侣开始耕作...');
                    } else {
                        worker.state = 'idle';
                    }
                }
            }
            
            // Monk can also automatically work when idle during day
            if (Game.isDay && worker.state === 'idle' && Math.random() < 0.005) {
                // Auto-find a tree to chop
                const tree = findNearestTree(worker.x);
                if (tree && tree.hasWood) {
                    worker.targetX = tree.x;
                    worker.state = 'moving_to_work';
                    worker.targetTree = tree;
                }
            }
        }
    }
}

function findNearestTree(x) {
    let nearest = null;
    let nearestDist = Infinity;
    
    for (const tree of Game.trees) {
        if (tree.hasWood) {
            const dist = Math.abs(tree.x - x);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = tree;
            }
        }
    }
    
    return nearest;
}

// ==================== 敌人系统 ====================
function spawnEnemies(dt) {
    if (Math.random() < CONFIG.ENEMY_SPAWN_RATE * dt) {
        const side = Math.random() < 0.5 ? -1 : 1;

        // 根据天数选择敌人类型
        const availableTypes = Game.ENEMY_TYPES.filter(t => Game.day >= t.minDay);
        const type = availableTypes[Math.floor(Math.random() * availableTypes.length)] || Game.ENEMY_TYPES[0];

        const scalingFactor = 1 + (Game.day - 1) * 0.15;

        const enemy = {
            x: side === -1 ? -30 : CONFIG.CANVAS_WIDTH + 30,
            y: CONFIG.GROUND_Y - 15,
            hp: type.hp * scalingFactor,
            maxHp: type.hp * scalingFactor,
            speed: type.speed + Math.random() * 10,
            damage: type.damage * scalingFactor,
            side: side,
            attackTimer: 0,
            typeName: type.name,
            color: type.color,
            size: type.name === '巨魔' ? 1.5 : (type.name === '骷髅' ? 0.9 : 1.0)
        };
        Game.enemies.push(enemy);
    }
}

function updateEnemies(dt) {
    for (let i = Game.enemies.length - 1; i >= 0; i--) {
        const enemy = Game.enemies[i];
        
        // 向篝火移动
        const targetX = Game.bonfire.x;
        const dx = targetX - enemy.x;
        
        if (Math.abs(dx) > 30) {
            enemy.x += Math.sign(dx) * enemy.speed * dt;
        } else {
            // 攻击篝火/工人
            enemy.attackTimer += dt;
            if (enemy.attackTimer >= 1) {
                enemy.attackTimer = 0;
                // 寻找附近的工人攻击
                let target = Game.workers.find(w => Math.abs(w.x - enemy.x) < 50);
                if (target) {
                    // 工人受伤逻辑（简化版）
                    showMessage('工人受到攻击！');
                } else {
                    // 攻击篝火
                    Game.bonfire.intensity -= 0.1;
                    triggerShake(5);
                    if (Game.bonfire.intensity < 0.2) {
                        showMessage('篝火即将熄灭！');
                    }
                }
            }
        }
        
        // 检查死亡
        if (enemy.hp <= 0) {
            SFX.playEnemyDeath();
            triggerShake(3);
            Game.enemies.splice(i, 1);
            
            // 死亡粒子
            for (let j = 0; j < 8; j++) {
                Game.particles.push({
                    x: enemy.x,
                    y: enemy.y - 15,
                    vx: (Math.random() - 0.5) * 6,
                    vy: -Math.random() * 3,
                    life: 1,
                    color: '#8B0000',
                    size: 4
                });
            }
        }
    }
}

// ==================== 资源系统 ====================
function consumeFood(dt) {
    const consumption = Game.workers.length * CONFIG.FOOD_CONSUMPTION_PER_WORKER * dt;
    Game.resources.food -= consumption;
    
    if (Game.resources.food < 0) {
        Game.resources.food = 0;
        // 饥饿逻辑（简化）
        if (Math.random() < 0.01) {
            showMessage('食物耗尽！工人开始饥饿...');
        }
    }
}

function produceFromFarms(dt) {
    const farms = Game.buildings.filter(b => b.type === 'farm');
    for (const farm of farms) {
        if (Math.random() < dt * 0.5) {
            Game.resources.food += CONFIG.FOOD_PER_FARM;
        }
    }
}

function regrowTrees(dt) {
    for (const tree of Game.trees) {
        if (!tree.hasWood && tree.regrowTime > 0) {
            tree.regrowTime -= dt;
            if (tree.regrowTime <= 0) {
                tree.hasWood = true;
            }
        }
    }
}

// ==================== 粒子系统 ====================
function updateParticles(dt) {
    for (let i = Game.particles.length - 1; i >= 0; i--) {
        const p = Game.particles[i];
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.vy += 2 * dt; // 重力
        p.life -= dt * 2;
        
        if (p.life <= 0) {
            Game.particles.splice(i, 1);
        }
    }
}

// ==================== 雪花粒子系统 ====================
function updateSnowflakes(dt) {
    for (const flake of Game.snowflakes) {
        flake.y += flake.speed * dt * 60;
        flake.wobble += dt * 2;
        flake.x += Math.sin(flake.wobble) * CONFIG.SNOW.WIND_SPEED * dt * 60;

        // 回到顶部
        if (flake.y > CONFIG.CANVAS_HEIGHT) {
            flake.y = -5;
            flake.x = Math.random() * CONFIG.CANVAS_WIDTH;
        }
        if (flake.x > CONFIG.CANVAS_WIDTH) flake.x = 0;
        if (flake.x < 0) flake.x = CONFIG.CANVAS_WIDTH;
    }
}

function renderSnowflakes() {
    for (const flake of Game.snowflakes) {
        ctx.globalAlpha = flake.opacity;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(flake.x, flake.y, flake.size, flake.size);
    }
    ctx.globalAlpha = 1;
}

// ==================== 屏幕震动 ====================
function triggerShake(intensity) {
    Game.shake.intensity = intensity || CONFIG.SHAKE.INTENSITY;
}

// ==================== 渲染系统 ====================
function render() {
    ctx.save();

    // 屏幕震动
    if (Game.shake.intensity > 0.5) {
        Game.shake.x = (Math.random() - 0.5) * Game.shake.intensity;
        Game.shake.y = (Math.random() - 0.5) * Game.shake.intensity;
        Game.shake.intensity *= CONFIG.SHAKE.DECAY;
        ctx.translate(Game.shake.x, Game.shake.y);
    } else {
        Game.shake.intensity = 0;
    }

    // 清空画布
    ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // 绘制天空
    renderSky();

    // 绘制地面
    renderGround();

    // 绘制树木
    renderTrees();

    // 绘制建筑
    renderBuildings();

    // 绘制篝火
    renderBonfire();

    // 绘制工人
    renderWorkers();

    // 绘制敌人
    renderEnemies();

    // 绘制粒子
    renderParticles();

    // 绘制雪花
    renderSnowflakes();

    // 绘制夜晚遮罩
    if (!Game.isDay) {
        renderNightOverlay();
    }

    ctx.restore();
}

function renderSky() {
    const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.GROUND_Y);
    
    if (Game.isDay) {
        // 白天
        const dayProgress = (Game.time - CONFIG.DAY_START_HOUR) / (CONFIG.NIGHT_START_HOUR - CONFIG.DAY_START_HOUR);
        
        if (dayProgress < 0.2) {
            // 清晨 - 霞光
            gradient.addColorStop(0, '#C45C48');
            gradient.addColorStop(0.3, '#D4A574');
            gradient.addColorStop(1, '#87CEEB');
        } else if (dayProgress > 0.8) {
            // 傍晚 - 暮霭
            gradient.addColorStop(0, '#8B4513');
            gradient.addColorStop(0.3, '#C45C48');
            gradient.addColorStop(1, '#4A6741');
        } else {
            // 正午 - 天青
            gradient.addColorStop(0, '#4A90A4');
            gradient.addColorStop(1, '#87CEEB');
        }
    } else {
        // 夜晚
        gradient.addColorStop(0, '#0a0a2e');
        gradient.addColorStop(1, '#1a1a3e');
        
        // 星星
        ctx.save();
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.GROUND_Y);
        
        // 绘制星星
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 30; i++) {
            const sx = (i * 73 + Game.day * 13) % CONFIG.CANVAS_WIDTH;
            const sy = (i * 37) % (CONFIG.GROUND_Y - 50);
            const twinkle = Math.sin(Date.now() / 1000 + i) * 0.5 + 0.5;
            ctx.globalAlpha = twinkle * 0.8;
            ctx.fillRect(sx, sy, 2, 2);
        }
        ctx.restore();
        return;
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.GROUND_Y);
    
    // 太阳/月亮
    if (Game.isDay) {
        // 太阳
        const sunProgress = (Game.time - CONFIG.DAY_START_HOUR) / (CONFIG.NIGHT_START_HOUR - CONFIG.DAY_START_HOUR);
        const sunX = 100 + sunProgress * 600;
        const sunY = 50 + Math.sin(sunProgress * Math.PI) * -30;
        
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 25, 0, Math.PI * 2);
        ctx.fill();
        
        // 太阳光晕
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 35, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // 明月 with subtle glow
        const moonX = 700;
        const moonY = 60;
        
        ctx.fillStyle = '#FFF8DC';
        ctx.beginPath();
        ctx.arc(moonX, moonY, 20, 0, Math.PI * 2);
        ctx.fill();
        // Moon craters (simplified)
        ctx.fillStyle = 'rgba(200,200,180,0.3)';
        ctx.beginPath();
        ctx.arc(moonX - 6, moonY - 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(moonX + 5, moonY + 3, 3, 0, Math.PI * 2);
        ctx.fill();
        // Glow
        ctx.fillStyle = 'rgba(255,248,220,0.1)';
        ctx.beginPath();
        ctx.arc(moonX, moonY, 35, 0, Math.PI * 2);
        ctx.fill();
    }
}

function renderGround() {
    // 雪地 with Chinese style texture
    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(0, CONFIG.GROUND_Y, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT - CONFIG.GROUND_Y);
    
    // Snow texture - subtle wave patterns
    ctx.fillStyle = '#E8E8E8';
    for (let i = 0; i < CONFIG.CANVAS_WIDTH; i += 30) {
        const wave = Math.sin(i * 0.05) * 3;
        ctx.fillRect(i, CONFIG.GROUND_Y + 8 + wave, 15, 2);
        ctx.fillRect(i + 10, CONFIG.GROUND_Y + 30 + wave, 12, 2);
    }
    
    // Horizon line
    ctx.fillStyle = '#D0D0D0';
    ctx.fillRect(0, CONFIG.GROUND_Y, CONFIG.CANVAS_WIDTH, 2);
    
    // Distant mountains silhouette (国风远山)
    ctx.fillStyle = 'rgba(100, 120, 140, 0.15)';
    ctx.beginPath();
    ctx.moveTo(0, CONFIG.GROUND_Y);
    for (let i = 0; i < CONFIG.CANVAS_WIDTH; i += 50) {
        const peak = 20 + Math.sin(i * 0.02) * 15;
        ctx.lineTo(i, CONFIG.GROUND_Y - peak);
    }
    ctx.lineTo(CONFIG.CANVAS_WIDTH, CONFIG.GROUND_Y);
    ctx.closePath();
    ctx.fill();
}

function renderTrees() {
    for (const tree of Game.trees) {
        if (!tree.hasWood) continue;
        
        // Tree shake when being chopped
        let shakeX = 0;
        const beingChopped = Game.workers.some(w => 
            w.targetTree === tree && w.state === 'working'
        );
        if (beingChopped) {
            shakeX = Math.sin(Date.now() / 50) * 2;
        }
        const drawX = tree.x + shakeX;
        
        // Trunk - 松树树干
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(drawX - 3, tree.y - tree.height, 6, tree.height);
        
        // Bark texture
        ctx.fillStyle = '#4A3728';
        ctx.fillRect(drawX - 2, tree.y - tree.height + 5, 4, 3);
        ctx.fillRect(drawX - 2, tree.y - tree.height + 20, 4, 3);
        
        // Pine needles (国风松针 - layered triangles)
        const layers = 4;
        for (let i = 0; i < layers; i++) {
            const layerY = tree.y - tree.height + 5 + i * 12;
            const layerWidth = 28 - i * 6;
            const greenShade = i % 2 === 0 ? '#1B5E20' : '#2E7D32';
            
            ctx.fillStyle = greenShade;
            ctx.beginPath();
            ctx.moveTo(drawX, layerY - 18);
            ctx.lineTo(drawX - layerWidth / 2, layerY + 3);
            ctx.lineTo(drawX + layerWidth / 2, layerY + 3);
            ctx.closePath();
            ctx.fill();
            
            // Snow on branches
            ctx.fillStyle = '#F0F0F0';
            ctx.beginPath();
            ctx.moveTo(drawX, layerY - 18);
            ctx.lineTo(drawX - layerWidth / 2 + 2, layerY);
            ctx.lineTo(drawX + layerWidth / 2 - 2, layerY);
            ctx.closePath();
            ctx.fill();
        }
        
        // Snow cap on top
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(drawX, tree.y - tree.height - 5);
        ctx.lineTo(drawX - 6, tree.y - tree.height + 5);
        ctx.lineTo(drawX + 6, tree.y - tree.height + 5);
        ctx.closePath();
        ctx.fill();
    }
}

function renderBuildings() {
    for (const building of Game.buildings) {
        switch (building.type) {
            case 'tent':
                renderTent(building);
                break;
            case 'farm':
                renderFarm(building);
                break;
            case 'wall':
                renderWall(building);
                break;
            case 'watchtower':
                renderWatchtower(building);
                break;
        }
    }
}

function renderTent(building) {
    const x = building.x;
    const y = building.y;
    
    // 帐篷主体
    ctx.fillStyle = '#8B7355';
    ctx.beginPath();
    ctx.moveTo(x, y - 35);
    ctx.lineTo(x - 25, y);
    ctx.lineTo(x + 25, y);
    ctx.closePath();
    ctx.fill();
    
    // 帐篷门
    ctx.fillStyle = '#654321';
    ctx.beginPath();
    ctx.moveTo(x, y - 15);
    ctx.lineTo(x - 8, y);
    ctx.lineTo(x + 8, y);
    ctx.closePath();
    ctx.fill();
}

function renderFarm(building) {
    const x = building.x;
    const y = building.y;
    const animFrame = Math.floor(Date.now() / 200);
    
    // 农田
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x - 20, y - 5, 40, 5);
    
    // 作物
    const cropGrowth = 1 + Math.sin(animFrame * 0.1) * 0.2;
    ctx.fillStyle = '#228B22';
    for (let i = -2; i <= 2; i++) {
        const h = 10 * cropGrowth;
        ctx.fillRect(x + i * 8 - 2, y - 5 - h, 4, h);
        // 叶子
        ctx.fillRect(x + i * 8 - 4, y - 5 - h - 3, 8, 4);
    }
    
    // Working indicator when farmer is present
    const hasFarmer = Game.workers.some(w => 
        w.assignedJob === 'farmer' && Math.abs(w.x - x) < 30 && w.state === 'working'
    );
    if (hasFarmer) {
        // Watering/hoeing sparkles
        ctx.fillStyle = '#87CEEB';
        for (let i = 0; i < 3; i++) {
            const sx = x + (Math.sin(animFrame * 0.5 + i * 2) * 15);
            const sy = y - 20 + Math.cos(animFrame * 0.3 + i) * 5;
            ctx.fillRect(sx, sy, 2, 2);
        }
    }
}

function renderWall(building) {
    const x = building.x;
    const y = building.y;
    
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(x - 3, y - 30, 6, 30);
    
    // 木桩顶部
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 30);
    ctx.lineTo(x, y - 35);
    ctx.lineTo(x + 5, y - 30);
    ctx.closePath();
    ctx.fill();
}

function renderWatchtower(building) {
    const x = building.x;
    const y = building.y;
    
    // 塔身
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x - 8, y - 50, 16, 50);
    
    // 塔顶
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(x - 12, y - 60, 24, 10);
    
    // 屋顶
    ctx.fillStyle = '#654321';
    ctx.beginPath();
    ctx.moveTo(x, y - 75);
    ctx.lineTo(x - 15, y - 60);
    ctx.lineTo(x + 15, y - 60);
    ctx.closePath();
    ctx.fill();
}

function renderBonfire() {
    const x = Game.bonfire.x;
    const y = Game.bonfire.y;
    const intensity = Game.bonfire.intensity;
    
    // 木柴
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x - 12, y - 3, 24, 6);
    ctx.fillRect(x - 8, y - 6, 16, 6);
    
    // 火焰（多层）
    const flicker = Math.sin(Game.bonfire.frame) * 0.3 + Math.sin(Game.bonfire.frame * 1.5) * 0.2;
    
    // 外层火焰
    ctx.fillStyle = `rgba(255, 107, 53, ${0.6 * intensity})`;
    ctx.beginPath();
    ctx.moveTo(x, y - 15 - flicker * 10);
    ctx.lineTo(x - 15, y);
    ctx.lineTo(x + 15, y);
    ctx.closePath();
    ctx.fill();
    
    // 中层火焰
    ctx.fillStyle = `rgba(255, 217, 61, ${0.8 * intensity})`;
    ctx.beginPath();
    ctx.moveTo(x, y - 25 - flicker * 8);
    ctx.lineTo(x - 10, y - 5);
    ctx.lineTo(x + 10, y - 5);
    ctx.closePath();
    ctx.fill();
    
    // 内层火焰
    ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * intensity})`;
    ctx.beginPath();
    ctx.moveTo(x, y - 20 - flicker * 5);
    ctx.lineTo(x - 5, y - 5);
    ctx.lineTo(x + 5, y - 5);
    ctx.closePath();
    ctx.fill();
    
    // 光晕（夜晚更明显）
    if (!Game.isDay) {
        const glowRadius = 80 + flicker * 20;
        const gradient = ctx.createRadialGradient(x, y - 10, 10, x, y - 10, glowRadius);
        gradient.addColorStop(0, `rgba(255, 150, 50, ${0.4 * intensity})`);
        gradient.addColorStop(1, 'rgba(255, 150, 50, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x - glowRadius, y - glowRadius - 10, glowRadius * 2, glowRadius * 2);
    }
    
    // Ground glow from bonfire
    ctx.fillStyle = 'rgba(255, 100, 50, 0.1)';
    ctx.beginPath();
    ctx.ellipse(x, y + 5, 40, 10, 0, 0, Math.PI * 2);
    ctx.fill();
}

function renderWorkers() {
    const animFrame = Math.floor(Date.now() / 200); // Animation frame counter
    
    for (const worker of Game.workers) {
        const x = worker.x;
        const y = worker.y;
        const isWalking = (worker.state === 'moving_to_work' || worker.state === 'arriving' || worker.state === 'returning');
        const isWorking = (worker.state === 'working');
        const isFighting = (worker.state === 'fighting');
        const legOffset = isWalking ? Math.sin(animFrame * 0.8) * 3 : 0;
        
        // Determine character design based on type and job
        const design = getCharacterDesign(worker);
        
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x - 8, y - 2, 16, 4);
        
        // Legs (animated)
        ctx.fillStyle = design.pantsColor;
        ctx.fillRect(x - 6, y - 12 + legOffset, 4, 12);
        ctx.fillRect(x + 2, y - 12 - legOffset, 4, 12);
        
        // Body (长袍/衣服)
        ctx.fillStyle = design.bodyColor;
        ctx.fillRect(x - 7, y - 28, 14, 16);
        
        // Belt/sash
        ctx.fillStyle = design.accentColor;
        ctx.fillRect(x - 7, y - 18, 14, 3);
        
        // Head
        ctx.fillStyle = design.skinColor;
        ctx.fillRect(x - 5, y - 36, 10, 8);
        
        // Hair/headwear
        if (design.headwear) {
            ctx.fillStyle = design.headwearColor;
            design.headwear(ctx, x, y - 36);
        }
        
        // Face (simple eyes)
        ctx.fillStyle = '#333';
        ctx.fillRect(x - 3, y - 33, 2, 2);
        ctx.fillRect(x + 1, y - 33, 2, 2);
        
        // Tool/Weapon
        if (isWorking && worker.assignedJob === 'logger') {
            // Axe swing animation
            const swingAngle = Math.sin(animFrame * 1.5) * 0.5;
            ctx.save();
            ctx.translate(x + 8, y - 20);
            ctx.rotate(swingAngle);
            // Axe handle
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(-1, -10, 2, 15);
            // Axe head
            ctx.fillStyle = '#A0A0A0';
            ctx.fillRect(-4, -12, 8, 4);
            ctx.restore();
        } else if (isFighting || worker.assignedJob === 'guard') {
            // Weapon held
            if (worker.hasSword) {
                // Sword
                ctx.fillStyle = '#C0C0C0';
                ctx.fillRect(x + 6, y - 32, 2, 18);
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(x + 4, y - 15, 6, 2);
            } else if (worker.hasBow) {
                // Bow
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(x + 7, y - 28, 2, 14);
                ctx.fillStyle = '#A0522D';
                ctx.beginPath();
                ctx.arc(x + 8, y - 21, 8, -Math.PI/2, Math.PI/2);
                ctx.stroke();
            } else {
                // Basic sword
                ctx.fillStyle = '#A0A0A0';
                ctx.fillRect(x + 6, y - 28, 2, 12);
            }
        } else if (worker.assignedJob === 'hunter') {
            // Small knife/tool
            ctx.fillStyle = '#A0A0A0';
            ctx.fillRect(x + 6, y - 22, 2, 6);
        } else if (worker.assignedJob === 'farmer') {
            // Hoe
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x + 7, y - 24, 2, 10);
            ctx.fillStyle = '#696969';
            ctx.fillRect(x + 5, y - 26, 6, 3);
        }
        
        // Defensive stance shield (when fighting)
        if (isFighting) {
            ctx.fillStyle = 'rgba(255,215,0,0.3)';
            ctx.fillRect(x - 12, y - 30, 4, 16);
        }
        
        // Working sparkle
        if (isWorking) {
            ctx.fillStyle = '#FFD700';
            const sparkleX = x + Math.sin(animFrame * 0.5) * 10;
            const sparkleY = y - 35 + Math.cos(animFrame * 0.5) * 5;
            ctx.fillRect(sparkleX - 1, sparkleY - 1, 2, 2);
        }
        
        // Name label with background
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x - 20, y - 48, 40, 10);
        ctx.fillStyle = '#FFF';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(worker.name, x, y - 40);
    }
}

function getCharacterDesign(worker) {
    const base = {
        skinColor: '#FDBCB4',
        pantsColor: '#4A3728',
        accentColor: '#C45C48'
    };
    
    // Monk - 僧侣: yellow robe, bald/shaved head
    if (worker.type === 'monk') {
        return {
            ...base,
            bodyColor: '#D4A017', // 僧袍黄
            pantsColor: '#8B7355',
            accentColor: '#8B4513',
            headwear: (ctx, x, y) => {
                // Shaved head - just a dot for hair knot
                ctx.fillStyle = '#333';
                ctx.fillRect(x + 1, y - 2, 3, 3);
            }
        };
    }
    
    // Logger - 伐木工: green clothes, straw hat
    if (worker.assignedJob === 'logger') {
        return {
            ...base,
            bodyColor: '#2E7D32', // 松绿衣
            pantsColor: '#5D4037',
            accentColor: '#8B4513',
            headwear: (ctx, x, y) => {
                // Straw hat 斗笠
                ctx.fillStyle = '#D4A574';
                ctx.beginPath();
                ctx.moveTo(x + 5, y - 2);
                ctx.lineTo(x - 8, y + 3);
                ctx.lineTo(x + 18, y + 3);
                ctx.closePath();
                ctx.fill();
            }
        };
    }
    
    // Hunter - 猎人: brown leather, fur hat
    if (worker.assignedJob === 'hunter') {
        return {
            ...base,
            bodyColor: '#8B4513', // 皮革褐
            pantsColor: '#4A3728',
            accentColor: '#C45C48',
            headwear: (ctx, x, y) => {
                // Fur cap
                ctx.fillStyle = '#A0522D';
                ctx.fillRect(x - 6, y - 5, 12, 5);
            }
        };
    }
    
    // Guard - 守卫: red armor, helmet
    if (worker.assignedJob === 'guard') {
        return {
            ...base,
            bodyColor: '#8B0000', // 盔甲红
            pantsColor: '#2F2F2F',
            accentColor: '#FFD700',
            headwear: (ctx, x, y) => {
                // Helmet with plume
                ctx.fillStyle = '#696969';
                ctx.fillRect(x - 6, y - 5, 12, 5);
                // Red plume
                ctx.fillStyle = '#DC143C';
                ctx.fillRect(x + 2, y - 10, 3, 6);
            }
        };
    }
    
    // Farmer - 农民: blue clothes, headscarf
    if (worker.assignedJob === 'farmer') {
        return {
            ...base,
            bodyColor: '#4169E1', // 靛蓝衣
            pantsColor: '#5D4037',
            accentColor: '#228B22',
            headwear: (ctx, x, y) => {
                // White headscarf
                ctx.fillStyle = '#F5F5F5';
                ctx.fillRect(x - 6, y - 4, 12, 4);
            }
        };
    }
    
    // Default wanderer - 流浪者: gray clothes, simple hair
    return {
        ...base,
        bodyColor: '#708090',
        pantsColor: '#4A3728',
        accentColor: '#C45C48',
        headwear: (ctx, x, y) => {
            // Simple hair bun
            ctx.fillStyle = '#333';
            ctx.fillRect(x - 1, y - 3, 4, 3);
        }
    };
}

function renderEnemies() {
    const animFrame = Math.floor(Date.now() / 200);
    
    for (const enemy of Game.enemies) {
        const x = enemy.x;
        const y = enemy.y;
        const s = enemy.size || 1;
        const isAttacking = (enemy.attackTimer > 0.5);
        const walkOffset = Math.sin(animFrame * 0.6 + x) * 3;
        
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(x, y, 12 * s, 4 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // === 哥布林 (Goblin) - 山魈 ===
        if (enemy.typeName === '哥布林') {
            // Body
            ctx.fillStyle = '#556B2F';
            ctx.fillRect(x - 10 * s, y - 25 * s + walkOffset, 20 * s, 18 * s);
            // Head (large with ears)
            ctx.fillStyle = '#6B8E23';
            ctx.fillRect(x - 9 * s, y - 38 * s, 18 * s, 15 * s);
            // Pointy ears
            ctx.fillStyle = '#556B2F';
            ctx.beginPath();
            ctx.moveTo(x - 9 * s, y - 35 * s);
            ctx.lineTo(x - 14 * s, y - 40 * s);
            ctx.lineTo(x - 9 * s, y - 30 * s);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(x + 9 * s, y - 35 * s);
            ctx.lineTo(x + 14 * s, y - 40 * s);
            ctx.lineTo(x + 9 * s, y - 30 * s);
            ctx.fill();
            // Eyes (red, angry)
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(x - 5 * s, y - 34 * s, 3 * s, 3 * s);
            ctx.fillRect(x + 2 * s, y - 34 * s, 3 * s, 3 * s);
            // Mouth with fangs
            ctx.fillStyle = '#333';
            ctx.fillRect(x - 4 * s, y - 28 * s, 8 * s, 3 * s);
            ctx.fillStyle = '#FFF';
            ctx.fillRect(x - 3 * s, y - 28 * s, 2 * s, 2 * s);
            ctx.fillRect(x + 1 * s, y - 28 * s, 2 * s, 2 * s);
            // Legs
            ctx.fillStyle = '#556B2F';
            ctx.fillRect(x - 8 * s, y - 8 * s + walkOffset, 5 * s, 10 * s);
            ctx.fillRect(x + 3 * s, y - 8 * s - walkOffset, 5 * s, 10 * s);
            // Club weapon
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x + 10 * s, y - 22 * s, 3 * s, 15 * s);
            // Attack animation - swing club
            if (isAttacking) {
                ctx.save();
                ctx.translate(x + 12 * s, y - 20 * s);
                ctx.rotate(Math.sin(animFrame) * 0.8);
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(-2, -2, 6, 12);
                ctx.restore();
            }
        }
        
        // === 骷髅 (Skeleton) - 白骨精 ===
        else if (enemy.typeName === '骷髅') {
            // Body bones
            ctx.fillStyle = '#FFFFF0';
            ctx.fillRect(x - 4 * s, y - 25 * s, 8 * s, 20 * s);
            // Ribs
            ctx.fillStyle = '#E8E8D0';
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(x - 7 * s, y - 20 * s + i * 6 * s, 14 * s, 2 * s);
            }
            // Skull
            ctx.fillStyle = '#FFFFF0';
            ctx.fillRect(x - 7 * s, y - 38 * s, 14 * s, 14 * s);
            // Eye sockets (glowing red)
            ctx.fillStyle = '#FF0000';
            ctx.globalAlpha = 0.6 + Math.sin(animFrame * 0.3) * 0.4;
            ctx.fillRect(x - 5 * s, y - 34 * s, 4 * s, 4 * s);
            ctx.fillRect(x + 1 * s, y - 34 * s, 4 * s, 4 * s);
            ctx.globalAlpha = 1;
            // Nose hole
            ctx.fillStyle = '#333';
            ctx.fillRect(x - 1 * s, y - 30 * s, 2 * s, 2 * s);
            // Jaw
            ctx.fillStyle = '#E8E8D0';
            ctx.fillRect(x - 5 * s, y - 26 * s, 10 * s, 3 * s);
            // Bone legs
            ctx.fillStyle = '#FFFFF0';
            ctx.fillRect(x - 3 * s, y - 6 * s + walkOffset, 2 * s, 10 * s);
            ctx.fillRect(x + 1 * s, y - 6 * s - walkOffset, 2 * s, 10 * s);
            // Bone arms holding spear
            ctx.fillStyle = '#FFFFF0';
            ctx.fillRect(x - 10 * s, y - 22 * s, 20 * s, 2 * s);
            // Spear
            ctx.fillStyle = '#8B7355';
            ctx.fillRect(x + 8 * s, y - 35 * s, 2 * s, 30 * s);
            ctx.fillStyle = '#A0A0A0';
            ctx.fillRect(x + 7 * s, y - 38 * s, 4 * s, 4 * s);
            // Attack - thrust spear
            if (isAttacking) {
                ctx.fillStyle = 'rgba(255,0,0,0.3)';
                ctx.fillRect(x + 10 * s, y - 35 * s, 20 * s, 4 * s);
            }
        }
        
        // === 暗影 (Shadow) - 影怪 ===
        else if (enemy.typeName === '暗影') {
            const flicker = 0.4 + Math.sin(animFrame * 0.5) * 0.3;
            ctx.globalAlpha = flicker;
            // Shadow body
            ctx.fillStyle = '#4B0082';
            ctx.beginPath();
            ctx.moveTo(x, y - 35 * s);
            ctx.lineTo(x - 12 * s, y - 5 * s);
            ctx.lineTo(x + 12 * s, y - 5 * s);
            ctx.closePath();
            ctx.fill();
            // Shadow head
            ctx.fillStyle = '#6A0DAD';
            ctx.beginPath();
            ctx.arc(x, y - 30 * s, 8 * s, 0, Math.PI * 2);
            ctx.fill();
            // Glowing eyes
            ctx.fillStyle = '#9400D3';
            ctx.globalAlpha = 0.8 + Math.sin(animFrame * 0.8) * 0.2;
            ctx.beginPath();
            ctx.arc(x - 3 * s, y - 32 * s, 2 * s, 0, Math.PI * 2);
            ctx.arc(x + 3 * s, y - 32 * s, 2 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = flicker;
            // Shadow tendrils
            ctx.strokeStyle = '#4B0082';
            ctx.lineWidth = 2;
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.moveTo(x + i * 4 * s, y - 5 * s);
                ctx.quadraticCurveTo(
                    x + i * 6 * s + Math.sin(animFrame * 0.3 + i) * 10,
                    y + 10 * s,
                    x + i * 4 * s + Math.sin(animFrame * 0.5 + i) * 5,
                    y + 5 * s
                );
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
            ctx.lineWidth = 1;
            // Shadow legs (fading)
            ctx.fillStyle = '#4B0082';
            ctx.fillRect(x - 4 * s, y - 5 * s, 2 * s, 8 * s);
            ctx.fillRect(x + 2 * s, y - 5 * s, 2 * s, 8 * s);
            // Attack - shadow burst
            if (isAttacking) {
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = '#9400D3';
                ctx.beginPath();
                ctx.arc(x, y - 20 * s, 20 * s, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }
        
        // === 巨魔 (Troll) - 山妖 ===
        else {
            // Large body
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x - 14 * s, y - 30 * s, 28 * s, 24 * s);
            // Muscular chest
            ctx.fillStyle = '#A0522D';
            ctx.fillRect(x - 10 * s, y - 28 * s, 20 * s, 12 * s);
            // Big head
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x - 10 * s, y - 45 * s, 20 * s, 18 * s);
            // Horns
            ctx.fillStyle = '#D4A574';
            ctx.beginPath();
            ctx.moveTo(x - 8 * s, y - 43 * s);
            ctx.lineTo(x - 14 * s, y - 55 * s);
            ctx.lineTo(x - 6 * s, y - 42 * s);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(x + 8 * s, y - 43 * s);
            ctx.lineTo(x + 14 * s, y - 55 * s);
            ctx.lineTo(x + 6 * s, y - 42 * s);
            ctx.fill();
            // Small angry eyes
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(x - 6 * s, y - 40 * s, 3 * s, 3 * s);
            ctx.fillRect(x + 3 * s, y - 40 * s, 3 * s, 3 * s);
            // Big mouth with tusks
            ctx.fillStyle = '#333';
            ctx.fillRect(x - 7 * s, y - 33 * s, 14 * s, 5 * s);
            ctx.fillStyle = '#FFFFF0';
            ctx.fillRect(x - 6 * s, y - 35 * s, 3 * s, 4 * s);
            ctx.fillRect(x + 3 * s, y - 35 * s, 3 * s, 4 * s);
            // Thick legs
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x - 10 * s, y - 8 * s + walkOffset, 7 * s, 10 * s);
            ctx.fillRect(x + 3 * s, y - 8 * s - walkOffset, 7 * s, 10 * s);
            // Giant club
            ctx.fillStyle = '#5D4037';
            ctx.fillRect(x + 12 * s, y - 25 * s, 6 * s, 25 * s);
            // Club head with spikes
            ctx.fillStyle = '#4A3728';
            ctx.fillRect(x + 10 * s, y - 30 * s, 10 * s, 8 * s);
            ctx.fillStyle = '#A0A0A0';
            ctx.fillRect(x + 11 * s, y - 32 * s, 2 * s, 3 * s);
            ctx.fillRect(x + 17 * s, y - 32 * s, 2 * s, 3 * s);
            // Attack - slam
            if (isAttacking) {
                ctx.save();
                ctx.translate(x + 15 * s, y - 10 * s);
                ctx.rotate(Math.sin(animFrame * 2) * 0.5);
                ctx.fillStyle = '#5D4037';
                ctx.fillRect(-3 * s, -15 * s, 6 * s, 20 * s);
                ctx.restore();
                // Ground impact
                ctx.fillStyle = 'rgba(139,69,19,0.3)';
                ctx.fillRect(x + 10 * s, y - 5 * s, 20 * s, 5 * s);
            }
        }
        
        // HP bar (3-color: green > 50%, yellow > 25%, red)
        const hpPercent = enemy.hp / enemy.maxHp;
        ctx.fillStyle = '#333';
        ctx.fillRect(x - 14 * s, y - (enemy.typeName === '巨魔' ? 58 : 52) * s, 28 * s, 4);
        ctx.fillStyle = hpPercent > 0.5 ? '#00FF00' : (hpPercent > 0.25 ? '#FFFF00' : '#FF0000');
        ctx.fillRect(x - 14 * s, y - (enemy.typeName === '巨魔' ? 58 : 52) * s, 28 * s * hpPercent, 4);
        
        // Enemy name above head
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x - 20, y - (enemy.typeName === '巨魔' ? 70 : 60) * s, 40, 10);
        ctx.fillStyle = '#FFD700';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(enemy.typeName, x, y - (enemy.typeName === '巨魔' ? 62 : 52) * s);
    }
}

function renderParticles() {
    for (const p of Game.particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
}

function renderNightOverlay() {
    // 夜晚暗化
    ctx.fillStyle = 'rgba(0, 0, 30, 0.5)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
}

// ==================== UI系统 ====================
function updateUI() {
    // 天数
    document.getElementById('day-display').textContent = Game.day;
    
    // 时间
    const hours = Math.floor(Game.time);
    const minutes = Math.floor((Game.time - hours) * 60);
    document.getElementById('time-display').textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    // 昼夜指示
    const icon = document.getElementById('daynight-icon');
    const text = document.getElementById('daynight-text');
    if (Game.isDay) {
        icon.textContent = '☀';
        text.textContent = '白天';
        icon.className = 'icon sun';
    } else {
        icon.textContent = '🌙';
        text.textContent = '夜晚';
        icon.className = 'icon moon';
    }
    
    // 资源
    document.getElementById('wood-count').textContent = Math.floor(Game.resources.wood);
    document.getElementById('food-count').textContent = Math.floor(Game.resources.food);
    document.getElementById('worker-count').textContent = Game.workers.length;
    
    // 更新建造按钮状态
    updateBuildButtons();
    
    // 更新工人列表
    updateWorkersList();
    
    // 更新制作按钮
    updateCraftButtons();
    
    // 更新地图
    updateMapUI();
}

function updateBuildButtons() {
    document.querySelectorAll('.build-item').forEach(item => {
        const type = item.dataset.type;
        const def = CONFIG.BUILDINGS[type];
        const btn = item.querySelector('.build-btn');
        const costEl = item.querySelector('.build-cost');
        const nameEl = item.querySelector('.build-name');
        
        if (!def) return;
        
        // Check if unlocked
        const isUnlocked = Game.day >= def.unlockDay && 
            (!def.unlockCondition || def.unlockCondition());
        
        if (!isUnlocked) {
            btn.disabled = true;
            btn.textContent = '锁定';
            item.style.opacity = '0.5';
            if (Game.day < def.unlockDay) {
                costEl.textContent = `🔒 第${def.unlockDay}天解锁`;
            } else {
                costEl.textContent = `🔒 条件不足`;
            }
        } else {
            item.style.opacity = '1';
            const costText = [];
            if (def.wood > 0) costText.push(`🪵 ${def.wood}`);
            if (def.food > 0) costText.push(`🍖 ${def.food}`);
            costEl.textContent = costText.join(' | ');
            
            const canAfford = Game.resources.wood >= def.wood && Game.resources.food >= def.food;
            btn.disabled = !canAfford;
            btn.textContent = canAfford ? '建造' : '资源不足';
        }
    });
}

function updateWorkersList() {
    const list = document.getElementById('workers-list');
    if (!list) return;
    
    list.innerHTML = '';
    for (const worker of Game.workers) {
        const entry = document.createElement('div');
        entry.className = 'worker-entry';
        entry.innerHTML = `
            <span class="worker-name">${worker.name}</span>
            <span class="worker-job">${worker.job}</span>
            <span class="worker-state">${getStateText(worker.state)}</span>
        `;
        list.appendChild(entry);
    }
}

function getStateText(state) {
    const texts = {
        idle: '待命',
        working: '工作中',
        fighting: '战斗中',
        resting: '休息中',
        returning: '返回中',
        guarding: '守卫中',
        moving_to_work: '前往工作',
        arriving: '赶来中'
    };
    return texts[state] || state;
}

function showMessage(text) {
    const box = document.getElementById('message-box');
    box.textContent = text;
    box.classList.add('show');
    
    setTimeout(() => {
        box.classList.remove('show');
    }, 3000);
}

// ==================== 事件处理 ====================
function initUI() {
    // 音效开关
    document.getElementById('btn-mute').addEventListener('click', () => {
        const enabled = SFX.toggle();
        document.getElementById('mute-icon').textContent = enabled ? '🔊' : '🔇';
    });

    // 建造按钮
    document.getElementById('btn-build').addEventListener('click', () => {
        togglePanel('build-panel');
    });
    
    // 工人按钮
    document.getElementById('btn-workers').addEventListener('click', () => {
        togglePanel('workers-panel');
    });
    
    // 制作按钮
    document.getElementById('btn-craft').addEventListener('click', () => {
        togglePanel('craft-panel');
        updateCraftButtons();
    });
    
    // 探索按钮
    document.getElementById('btn-explore').addEventListener('click', () => {
        togglePanel('explore-panel');
        updateMapUI();
        updateExploreLogUI();
    });
    
    // 存档按钮
    document.getElementById('btn-save').addEventListener('click', () => {
        saveGame();
    });
    
    // 关闭按钮
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.panel').classList.add('hidden');
        });
    });
    
    // 建造项目按钮
    document.querySelectorAll('.build-item .build-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const item = e.target.closest('.build-item');
            const type = item.dataset.type;
            buildStructure(type);
        });
    });
    
    // 分配工作按钮
    document.querySelectorAll('.assign-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const job = e.target.dataset.job;
            // 分配最近招募的未分配工人
            const unassigned = Game.workers.find(w => w.job === '流浪者');
            if (unassigned) {
                assignJob(unassigned.id, job);
            } else {
                showMessage('没有可分配的工人，等待流浪者到来...');
            }
        });
    });
    
    // 制作按钮
    document.querySelectorAll('.craft-item .craft-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const item = e.target.closest('.craft-item');
            const itemType = item.dataset.item;
            craftItem(itemType);
        });
    });
    
    // 地图区域选择
    document.querySelectorAll('.map-region').forEach(el => {
        el.addEventListener('click', (e) => {
            const region = e.target.dataset.region;
            
            // 海岸需要小船才能探索
            if (region === 'shore' && !Game.craftedItems.includes('boat')) {
                showMessage('需要制作小船才能探索海岸！');
                return;
            }
            
            // 新大陆需要先发现海岸
            if (region === 'newland' && !Game.discoveredRegions.includes('shore')) {
                showMessage('需要先探索海岸！');
                return;
            }
            
            Game.selectedRegion = region;
            updateMapUI();
        });
    });
    
    // 派遣侦察按钮
    const scoutBtn = document.getElementById('btn-scout');
    if (scoutBtn) {
        scoutBtn.addEventListener('click', () => {
            if (Game.selectedRegion && Game.selectedRegion !== 'camp') {
                scoutRegion(Game.selectedRegion);
            }
        });
    }
    
    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // ESC关闭所有面板
            document.querySelectorAll('.panel, .modal').forEach(p => p.classList.add('hidden'));
            Game.paused = false;
        } else if (e.key === 's' && e.ctrlKey) {
            e.preventDefault();
            saveGame();
        }
    });
    
    // 自动存档（每5分钟）
    setInterval(() => {
        if (!Game.gameOver && !Game.paused) {
            saveGame();
        }
    }, 300000);
    
    // 点击画布：僧侣移动
    let isHoldingCanvas = false;
    
    canvas.addEventListener('mousedown', (e) => {
        isHoldingCanvas = true;
        moveMonkToClick(e);
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (isHoldingCanvas) {
            moveMonkToClick(e);
        }
    });
    
    canvas.addEventListener('mouseup', () => {
        isHoldingCanvas = false;
    });
    
    canvas.addEventListener('mouseleave', () => {
        isHoldingCanvas = false;
    });
    
    // 触摸屏支持
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        isHoldingCanvas = true;
        moveMonkToTouch(touch);
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (isHoldingCanvas) {
            const touch = e.touches[0];
            moveMonkToTouch(touch);
        }
    });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        isHoldingCanvas = false;
    });
    
    function moveMonkToClick(e) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (CONFIG.CANVAS_WIDTH / rect.width);
        // 限制在画布范围内
        const clampedX = Math.max(20, Math.min(CONFIG.CANVAS_WIDTH - 20, x));
        
        const monk = Game.workers.find(w => w.type === 'monk');
        if (monk) {
            monk.targetX = clampedX;
            monk.state = 'moving_to_work';
        }
        
        // 点击目标位置指示器
        for (let i = 0; i < 6; i++) {
            Game.particles.push({
                x: clampedX,
                y: CONFIG.GROUND_Y - 10,
                vx: (Math.random() - 0.5) * 3,
                vy: -Math.random() * 2,
                life: 0.8,
                color: '#FFD700',
                size: 3
            });
        }
    }
    
    function moveMonkToTouch(touch) {
        const rect = canvas.getBoundingClientRect();
        const x = (touch.clientX - rect.left) * (CONFIG.CANVAS_WIDTH / rect.width);
        const clampedX = Math.max(20, Math.min(CONFIG.CANVAS_WIDTH - 20, x));
        
        const monk = Game.workers.find(w => w.type === 'monk');
        if (monk) {
            monk.targetX = clampedX;
            monk.state = 'moving_to_work';
        }
    }
    
    // 随机招募流浪者（白天概率）
    setInterval(() => {
        if (Game.isDay && Math.random() < 0.2) {
            const wandererNames = ['艾拉', '卡尔', '布伦', '芙蕾雅', '格瑞克', '希尔德'];
            const name = wandererNames[Math.floor(Math.random() * wandererNames.length)];
            addWorker('wanderer', name);
            showMessage(`流浪者 ${name} 被篝火吸引而来！`);
        }
    }, 10000);
}

function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    const isHidden = panel.classList.contains('hidden');
    
    // 隐藏所有面板
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    
    if (isHidden) {
        panel.classList.remove('hidden');
    }
}

// ==================== 制作系统 ====================
function craftItem(itemType) {
    const recipe = CONFIG.CRAFT_RECIPES[itemType];
    if (!recipe) return false;
    
    if (Game.craftedItems.includes(itemType)) {
        showMessage(`${recipe.name} 已经制作过了！`);
        return false;
    }
    
    if (Game.resources.wood < recipe.wood || Game.resources.food < recipe.food) {
        showMessage('资源不足！');
        SFX.playError();
        return false;
    }
    
    Game.resources.wood -= recipe.wood;
    Game.resources.food -= recipe.food;
    Game.craftedItems.push(itemType);
    
    showMessage(`制作完成：${recipe.name}！`);
    SFX.playCraft();
    
    // 制作特效
    for (let i = 0; i < 12; i++) {
        Game.particles.push({
            x: Game.bonfire.x + (Math.random() - 0.5) * 40,
            y: Game.bonfire.y - 20,
            vx: (Math.random() - 0.5) * 5,
            vy: -Math.random() * 4 - 1,
            life: 1.5,
            color: '#FFD700',
            size: 4
        });
    }
    
    // 特殊效果
    if (itemType === 'bow') {
        // 守卫获得远程攻击能力
        for (const worker of Game.workers) {
            if (worker.assignedJob === 'guard') {
                worker.hasBow = true;
            }
        }
    } else if (itemType === 'sword') {
        for (const worker of Game.workers) {
            if (worker.assignedJob === 'guard') {
                worker.hasSword = true;
            }
        }
    } else if (itemType === 'boat') {
        showMessage('现在可以探索海岸了！');
    }
    
    updateCraftButtons();
    updateUI();
    return true;
}

function updateCraftButtons() {
    document.querySelectorAll('.craft-item').forEach(item => {
        const itemType = item.dataset.item;
        const recipe = CONFIG.CRAFT_RECIPES[itemType];
        const btn = item.querySelector('.craft-btn');
        
        if (Game.craftedItems.includes(itemType)) {
            btn.textContent = '已制作';
            btn.disabled = true;
            btn.classList.add('crafted');
        } else if (Game.resources.wood >= recipe.wood && Game.resources.food >= recipe.food) {
            btn.disabled = false;
        } else {
            btn.disabled = true;
        }
    });
}

// ==================== 探索系统 ====================
function discoverRegion(regionId) {
    if (!Game.discoveredRegions.includes(regionId)) {
        Game.discoveredRegions.push(regionId);
        const region = CONFIG.REGIONS[regionId];
        showMessage(`发现了新区域：${region.name}！`);
        addExploreLog(`发现了 ${region.name}：${region.desc}`);
        updateMapUI();
        
        // 剧情推进
        if (regionId === 'dungeon' && Game.storyProgress < 1) {
            setTimeout(() => {
                triggerEventById('ancient_ruins');
            }, 2000);
        }
    }
}

function scoutRegion(regionId) {
    const region = CONFIG.REGIONS[regionId];
    if (!region) return;
    
    // 需要侦察兵
    const scout = Game.workers.find(w => w.assignedJob === 'guard');
    if (!scout) {
        showMessage('需要至少1名守卫才能派遣侦察！');
        return;
    }
    
    // 探索耗时
    showMessage(`派遣 ${scout.name} 前往 ${region.name} 探索...`);
    
    setTimeout(() => {
        discoverRegion(regionId);
        
        // 随机奖励
        const rewards = [
            { wood: 10, food: 5 },
            { wood: 15, food: 0 },
            { wood: 5, food: 10 },
            { wood: 20, food: 10 }
        ];
        const reward = rewards[Math.floor(Math.random() * rewards.length)];
        Game.resources.wood += reward.wood;
        Game.resources.food += reward.food;
        
        addExploreLog(`${scout.name} 从 ${region.name} 返回，带回了 ${reward.wood} 木材和 ${reward.food} 食物。`);
        showMessage(`探索完成！获得 ${reward.wood} 木材和 ${reward.food} 食物。`);
        updateUI();
    }, 3000);
}

function addExploreLog(message) {
    Game.exploreLog.unshift({
        message: message,
        day: Game.day,
        time: Game.time
    });
    
    // 最多保留20条
    if (Game.exploreLog.length > 20) {
        Game.exploreLog.pop();
    }
    
    updateExploreLogUI();
}

function updateMapUI() {
    document.querySelectorAll('.map-region').forEach(el => {
        const region = el.dataset.region;
        if (Game.discoveredRegions.includes(region)) {
            el.classList.add('discovered');
        }
        
        if (Game.selectedRegion === region) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    });
    
    // 更新派遣按钮
    const scoutBtn = document.getElementById('btn-scout');
    if (scoutBtn) {
        scoutBtn.disabled = !Game.selectedRegion || !Game.discoveredRegions.includes(Game.selectedRegion);
    }
}

function updateExploreLogUI() {
    const logEl = document.getElementById('explore-log');
    if (!logEl) return;
    
    logEl.innerHTML = '';
    for (const entry of Game.exploreLog.slice(0, 5)) {
        const div = document.createElement('div');
        div.className = 'explore-log-entry';
        div.textContent = `第${entry.day}天: ${entry.message}`;
        logEl.appendChild(div);
    }
}

// ==================== 事件系统 ====================
function triggerRandomEvent() {
    if (Game.eventCooldown > 0) return;
    if (Game.paused) return;
    
    // 筛选满足条件的事件
    const availableEvents = CONFIG.EVENTS.filter(e => {
        try {
            return e.condition();
        } catch {
            return false;
        }
    });
    
    if (availableEvents.length === 0) return;
    
    // 随机选择一个事件
    const event = availableEvents[Math.floor(Math.random() * availableEvents.length)];
    
    // 设置冷却（避免事件太频繁）
    Game.eventCooldown = 30;
    
    showEvent(event);
}

function triggerEventById(eventId) {
    const event = CONFIG.EVENTS.find(e => e.id === eventId);
    if (event) {
        showEvent(event);
    }
}

function showEvent(event) {
    Game.paused = true;
    SFX.playEvent();
    
    const modal = document.getElementById('event-modal');
    const title = document.getElementById('event-title');
    const desc = document.getElementById('event-desc');
    const choices = document.getElementById('event-choices');
    
    title.textContent = event.title;
    desc.textContent = event.desc;
    choices.innerHTML = '';
    
    for (const choice of event.choices) {
        const btn = document.createElement('button');
        btn.className = 'event-choice';
        btn.textContent = choice.text;
        btn.addEventListener('click', () => {
            choice.action();
            modal.classList.add('hidden');
            Game.paused = false;
        });
        choices.appendChild(btn);
    }
    
    modal.classList.remove('hidden');
}

// ==================== 存档系统 ====================
function saveGame() {
    const saveData = {
        day: Game.day,
        time: Game.time,
        resources: Game.resources,
        workers: Game.workers.map(w => ({
            id: w.id,
            type: w.type,
            name: w.name,
            job: w.job,
            assignedJob: w.assignedJob,
            hasBow: w.hasBow,
            hasSword: w.hasSword
        })),
        buildings: Game.buildings,
        craftedItems: Game.craftedItems,
        discoveredRegions: Game.discoveredRegions,
        storyProgress: Game.storyProgress,
        trees: Game.trees.map(t => ({
            x: t.x,
            hasWood: t.hasWood
        }))
    };
    
    localStorage.setItem('bonfire_save', JSON.stringify(saveData));
    showMessage('游戏已保存！');
    SFX.playSave();
}

function loadGame() {
    const saveStr = localStorage.getItem('bonfire_save');
    if (!saveStr) {
        showMessage('没有找到存档！');
        return false;
    }
    
    try {
        const save = JSON.parse(saveStr);
        
        Game.day = save.day || 1;
        Game.time = save.time || 6;
        Game.resources = save.resources || { wood: 30, food: 20 };
        Game.craftedItems = save.craftedItems || [];
        Game.discoveredRegions = save.discoveredRegions || ['camp'];
        Game.storyProgress = save.storyProgress || 0;
        
        // 重建工人
        Game.workers = [];
        if (save.workers) {
            for (const w of save.workers) {
                const worker = addWorker(w.type, w.name);
                worker.job = w.job;
                worker.assignedJob = w.assignedJob;
                worker.hasBow = w.hasBow;
                worker.hasSword = w.hasSword;
            }
        }
        
        // 重建建筑
        Game.buildings = save.buildings || [];
        
        // 重建树木状态
        if (save.trees) {
            for (let i = 0; i < Math.min(save.trees.length, Game.trees.length); i++) {
                Game.trees[i].hasWood = save.trees[i].hasWood;
            }
        }
        
        updateCraftButtons();
        updateMapUI();
        updateUI();
        showMessage('存档已加载！');
        return true;
    } catch (e) {
        console.error('加载存档失败:', e);
        showMessage('存档损坏，无法加载！');
        return false;
    }
}

function hasSave() {
    return localStorage.getItem('bonfire_save') !== null;
}

// ==================== 剧情系统 ====================
function initPrologue() {
    const prologue = document.getElementById('prologue');
    const startBtn = document.getElementById('btn-start-game');
    const lines = document.querySelectorAll('.story-line');

    if (!prologue) return;

    // Auto-play story lines
    let currentLine = 0;
    const showNextLine = () => {
        if (currentLine < lines.length) {
            lines[currentLine].classList.add('active');
            currentLine++;
            setTimeout(showNextLine, 2500);
        }
    };

    // Start showing lines after a short delay
    setTimeout(showNextLine, 500);

    // Start game button
    startBtn.addEventListener('click', () => {
        prologue.classList.add('hidden');
        SFX.init();
        SFX.startBonfireAmbience();
        SFX.setDayNight(Game.isDay);
        setTimeout(() => {
            prologue.style.display = 'none';
        }, 1000);
    });
}

// Quest system
const QUESTS = [
    { id: 'start', title: '初来乍到', desc: '点燃篝火，收集木材与食物，生存下去', condition: () => Game.day >= 1 },
    { id: 'build', title: '安家立命', desc: '建造一个帐篷，为工人提供住所', condition: () => Game.buildings.some(b => b.type === 'tent') },
    { id: 'recruit', title: '召集同伴', desc: '招募至少3名工人，分配工作', condition: () => Game.workers.length >= 3 },
    { id: 'defend', title: '夜守营火', desc: '指派一名守卫，抵御夜晚的怪物', condition: () => Game.workers.some(w => w.assignedJob === 'guard') },
    { id: 'explore', title: '探索未知', desc: '派遣侦察兵探索迷雾森林', condition: () => Game.discoveredRegions.includes('forest') },
    { id: 'craft', title: '锻造武器', desc: '制作一把弓或铁剑', condition: () => Game.craftedItems.length > 0 },
    { id: 'dungeon', title: '远古遗迹', desc: '发现古代地下城，寻找泰坦的秘密', condition: () => Game.discoveredRegions.includes('dungeon') },
    { id: 'titan', title: '泰坦觉醒', desc: '解放远古泰坦，击败觉醒之龙', condition: () => Game.storyProgress >= 3 }
];

let currentQuestIndex = 0;

function updateQuest() {
    const questPanel = document.getElementById('quest-panel');
    const titleEl = document.getElementById('quest-title');
    const descEl = document.getElementById('quest-desc');

    if (!questPanel) return;

    // Check if current quest is completed
    if (currentQuestIndex < QUESTS.length) {
        const quest = QUESTS[currentQuestIndex];
        if (quest.condition()) {
            // Quest completed
            showMessage(`任务完成：${quest.title}！`);
            SFX.playEvent();
            currentQuestIndex++;

            // Show next quest
            if (currentQuestIndex < QUESTS.length) {
                const nextQuest = QUESTS[currentQuestIndex];
                titleEl.textContent = nextQuest.title;
                descEl.textContent = nextQuest.desc;

                // Re-trigger animation
                questPanel.style.animation = 'none';
                setTimeout(() => {
                    questPanel.style.animation = '';
                }, 10);
            } else {
                questPanel.classList.add('hidden');
            }
        } else {
            // Show current quest
            titleEl.textContent = quest.title;
            descEl.textContent = quest.desc;
            questPanel.classList.remove('hidden');
        }
    }
}

// ==================== 启动游戏 ====================
window.addEventListener('load', initGame);