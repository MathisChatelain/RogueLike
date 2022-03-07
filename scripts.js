var canvas = document.getElementById("gameCanvas");
canvas.width = window.screen.width;
canvas.height = window.screen.height*0.8;
var ctx = canvas.getContext("2d");
let rect = canvas.getBoundingClientRect();
let gameIsPaused = false;
let frameDuration = 4; // minimum pour setTimeout
let depth = 1;

var projectiles = [];
var monsters = [];

function framePerSeconds(secondes){
    // Renvoie le nombre de frame correspondant à une durée en secondes donnée en paramètre
    return Math.round(1000/frameDuration*secondes)
}

function updateAcceleration(entity){
    entity.accelerationX *= 1-entity.sizeX*0.001;
    entity.accelerationY *= 1-entity.sizeY*0.001;
    if(Math.abs(entity.accelerationX)<0.1){ entity.accelerationX = 0;}
    if(Math.abs(entity.accelerationY)<0.1){ entity.accelerationY = 0;}
}

function dammageCalculator(cible,source){
    // parametres : cible des dommages, source des dommages et index de la cible dans sa liste d'entités
    cible.PDV -= source.DMG;
    if(cible.PDV <= 0){
        cible.removeInstance();
    }
}

function pause(){
    clearInterval(frameUpdater);
    gameIsPaused = true;
}

function entityColumnCheck(entity,xmin,xmax){
    let valren = false; 
    if(entity.posX > xmin){
        if(entity.posX+entity.sizeX < xmax){       
            valren = true;
        }
    }
    return valren;
}

function entityRowCheck(entity,ymin,ymax){
    let valren = false; 
    if(entity.posY > ymin){
        if(entity.posY+entity.sizeY < ymax){       
            valren = true;
        }
    }
    return valren;
}

function isInside(x,y,xmin,xmax,ymin,ymax){
    // Renvoie true si le point aux coordonnées (x,y) appartient au rectangle (xmin,xmax,ymin,ymax) (bords compris)
    if(x >= xmin && x <= xmax && y >= ymin && y <= ymax){
        return true;
    }
    else{
        return false;
    }
}

function renderMeleeAtatck(x,y,range,deg,etape){

}

function isInContact(x,y,radius,xmin,xmax,ymin,ymax){
    // Renvoie true si le cercle de centre (x,y) et de rayon "radius" est en contact avec le rect angle (xmin,xmax,ymin,ymax)
    if(x >= xmin-radius && x <= xmax+radius && y >= ymin-radius && y <= ymax+radius*2){
        return true;
    }
    else{
        return false;
    }
}

class Player{
    // Gestion
    id = "00000000" // Un identifiant à 8 chiffres doit être déclaré à la création d'un joueur
    
    // Graphisme
    sizeX = 50;
    sizeY = 50;  

    // Stats
    PDV = 100;
    PDVMAX = 100;
    MANA = 100;
    MANAMAX = 100;
    DMG = 20;
    EXP = 0;
    LVL = 1;
    EXPLVL = 100 ; //exp requise pour up, 100 de base puis 10% de plus que le niveau précédent à chaque niveau

    currentAttackCooldown = 0;
    baseAttackCooldown = framePerSeconds(0.5);  // 250 millisecondes en frames
    unbuffedAttackCooldown = this.baseAttackCooldown;

    // Physique
    vitesseActuelle = 0;       // pixels par update
    vitesseDeBase = 1;
    isMoving = false;
    posX = (canvas.width-this.sizeX)/2; // Centre le joueur au départ
    posY = (canvas.height-this.sizeY)/2;
    accelerationX = 0;
    accelerationY = 0;
    targetX = 0;
    targetY = 0;
    cosTarget = 0;          // angles de la vitesse par rapport à target ( plus pratique que l'orientation en degrés )
    sinTarget = 0;

    // Stats des compétences

    // Combat 

    combatCooldown = 0;
    combatBaseCooldown = framePerSeconds(4);
    combatRange = 1000;
    combatSize = 40;
    combatSpeed = 3;

    combatColor = "#a7333f"

    combatManaCost = 10;

    // Buff

    buffDuration = framePerSeconds(3); 
    buffBaseDuration = this.buffDuration;

    buffCooldown = 0;
    buffBaseCooldown = framePerSeconds(5);

    buffOnBaseAttackCooldown = 0.5;

    buffManaCost = 10;

    // Dash
    dashDuration = framePerSeconds(0.5);
    dashBaseDuration = this.dashDuration;

    dashCooldown = 0;
    dashBaseCooldown = framePerSeconds(5);

    dashIsControlable = true;           // signifie que le dash est un simple accélération dans un direction
    dashRange = 300;
    dashRangeIsUsed = false;
    dashSpeed = 3;
    dashAcceleration = 10;

    dashManaCost = 10;

    // END : Stats des compétences -------

    // Utilitaire
    leftClickDown = false;
    rightClickDown = false;
    mouseX = 0;
    mouseY = 0;

    constructor() {
        ctx.beginPath();
        ctx.rect(this.posX,this.posY,this.sizeX,this.sizeY);
        ctx.fillStyle = "#385F71";
        ctx.fill();
        ctx.closePath();

        // note le niveau permet de n'update le niveau que au besoin
        document.getElementById("niveau").innerText = this.LVL;
    }

    setMove(e){ 
        let rect = canvas.getBoundingClientRect(); // IMPORTANT  : assure que les positions soient relatives à la fenetre
        this.targetX = e.clientX - rect.left - this.sizeX/2;         // change la position que le player doit rejoindre
        this.targetY = e.clientY - rect.top - this.sizeY/2;          
        // note l'orientation relative à target
        let adjacent = this.targetX-this.posX;
        let oppose = this.targetY-this.posY;
        let hypotenuse = Math.hypot(oppose,adjacent);

        this.sinTarget = oppose/hypotenuse; 
        this.cosTarget = adjacent/hypotenuse;
        this.isMoving = true;
    }

    fire(x,y){
        let rect = canvas.getBoundingClientRect();    // IMPORTANT  : assure que les positions soient relatives à la fenetre
        if(this.currentAttackCooldown <= 0){
            new Projectiles(this,monsters,x-rect.left,y-rect.top);
            this.currentAttackCooldown = this.baseAttackCooldown;
        }
    }

    addMovementsListeners() {                            
        document.addEventListener('contextmenu', e => {         // Clique droit
            e.preventDefault();                                 // Empeche l'ouverture du menu déroulant du clique droit
        });

        document.addEventListener('mousedown', e => {      
            switch (e.button){ 
                case 0 :            // Clique gauche
                    this.fire(e.clientX,e.clientY);
                    this.leftClickDown = true;
                    break
                
                case 2 :             // Clique droit
                    this.setMove(e);
                    this.rightClickDown = true;
                    break
            }
        });

        document.addEventListener('mousemove', e => {     

            if(this.rightClickDown == true){
                this.setMove(e); // 20 updates de la direction par seconde             
            }
            
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        document.addEventListener('mouseup', e => {      
            switch (e.button){ 
                case 0 :            // Clique gauche
                    if(this.leftClickDown == true){
                    this.leftClickDown = false;
                    }
                    break
                
                case 2 :             // Clique droit
                    if(this.rightClickDown == true){
                    this.rightClickDown = false;
                    }
                    break
            }
        });
    }

    updateMovements() {
        let gotToTargetX = Math.round(this.targetX-this.posX)*Math.sign(this.cosTarget);
        let gotToTargetY = Math.round(this.targetY-this.posY)*Math.sign(this.sinTarget);
        let oldX = this.posX;
        let oldY = this.posY;

        if( gotToTargetX > 0 && gotToTargetY > 0 && this.isMoving == true){ // Si on est pas très proche de la cible
            this.vitesseActuelle = this.vitesseDeBase;
            this.posX += this.vitesseActuelle*this.cosTarget; // Vitesse horizontale
            this.posY += this.vitesseActuelle*this.sinTarget; // Vitesse verticale
        }
        else{
            this.vitesseActuelle = 0;
            this.isMoving = false;
        }
        this.posX += this.accelerationX;
        this.posY += this.accelerationY;

        if(entityColumnCheck(this,0,canvas.width) == false){ 
            // si on va dépasser la limite de l'ecran en collone on annule le dernier mouvement sur X :
            this.posX = oldX;
        }

        if(entityRowCheck(this,0,canvas.height) == false){ 
            // si on va dépasser la limite de l'ecran en ligne on annule le dernier mouvement sur Y :
            this.posY = oldY;
        }

        updateAcceleration(this);
    }

    updateRendering() {
        ctx.beginPath();
        ctx.lineWidth = "1";
        ctx.rect(this.posX,this.posY,this.sizeX,this.sizeY);
        ctx.fillStyle = "#385F71";
        ctx.fill();
        ctx.closePath();

        let PDVpercentage = (this.PDV/this.PDVMAX).toFixed(2);
        ctx.beginPath();
        ctx.rect(this.posX,this.posY-10,this.sizeX*PDVpercentage,5); // barre de pdv
        ctx.fillStyle = "#800E13";
        ctx.fill();
        ctx.closePath();

        if(this.EXP >= this.EXPLVL){ // Vérifie que le joueur est toujours au même niveau avant de faire le rendu
            this.EXP = 0;
            this.LVL += 1;
            this.EXPLVL = Math.round(this.EXPLVL*1.1);
            document.getElementById("niveau").innerText = this.LVL;
        }

        // Update des barres de l'interface, *40 correspond à la largeur des barres dans le css
        let pdvBarre = document.getElementById("pdv");
        pdvBarre.style.boxShadow = "inset " + "-" + (40-this.PDV/this.PDVMAX*40).toFixed(2) + "vw " + "0px grey";
        pdvBarre.innerText = this.PDV + "/" + this.PDVMAX;
    
        let manaBarre = document.getElementById("mana");
        manaBarre.style.boxShadow = "inset " + "-" + (40-this.MANA/this.MANAMAX*40).toFixed(2) + "vw " + "0px grey";
        manaBarre.innerText = this.MANA + "/" + this.MANAMAX;
        
        let expBarre = document.getElementById("exp");
        expBarre.style.boxShadow = "inset " + "-" + (40-this.EXP/this.EXPLVL*40).toFixed(2) + "vw " + "0px grey";
        expBarre.innerText = this.EXP + "/" + this.EXPLVL;

        let dashButton = document.getElementById("dash");
        dashButton.style.boxShadow = "inset "  + "0px " + "-" + (this.dashCooldown/this.dashBaseCooldown*8).toFixed(2) + "vh rgba(50, 50, 50, 0.7)";

        let buffButton = document.getElementById("buff");
        buffButton.style.boxShadow = "inset "  + "0px " + "-" + (this.buffCooldown/this.buffBaseCooldown*8).toFixed(2) + "vh rgba(50, 50, 50, 0.7)";

        let closeButton = document.getElementById("close");
        closeButton.style.boxShadow = "inset "  + "0px " + "-" + (this.combatCooldown/this.combatBaseCooldown*8).toFixed(2) + "vh rgba(50, 50, 50, 0.7)";
    }

    updateCooldowns(){
        this.combatCooldown -= 1;

        this.dashCooldown -= 1;
        this.dashDuration -= 1;

        this.buffCooldown -= 1;
        this.buffDuration -= 1;
        if(this.buffDuration<=0){this.unapplyBuff();}

        this.combatCooldown -= 1;

        this.currentAttackCooldown -= 1;
        if(this.currentAttackCooldown <= 0 && this.leftClickDown){
            this.fire(this.mouseX,this.mouseY);
            this.currentAttackCooldown = this.baseAttackCooldown;
        }
    }

    // Compétences 
    // 1 : attaque au CaC / 2 : Utilitaire / 3 : déplacement.

    combatSkill(){
        if(this.combatCooldown <= 0 && this.MANA >= this.combatManaCost){
            let rect = canvas.getBoundingClientRect();    // IMPORTANT  : assure que les positions soient relatives à la fenetre
            let x = this.mouseX;
            let y = this.mouseY;
            new Projectiles(this,monsters,x-rect.left,y-rect.top,this.combatSize,this.combatRange,this.combatColor,this.combatSpeed,true);
            this.combatCooldown = this.combatBaseCooldown;
            this.MANA -= this.combatManaCost;
        }
    }

    buffSkill(){
        if(this.buffCooldown <= 0 && this.MANA >= this.buffManaCost){
            this.MANA -= this.buffManaCost;

            this.applyBuff();
            this.buffDuration = this.buffBaseDuration;
            this.buffCooldown = this.buffBaseCooldown;
        }
    }

    applyBuff(){
        this.baseAttackCooldown *= this.buffOnBaseAttackCooldown;
    }

    unapplyBuff(){
        this.baseAttackCooldown = this.unbuffedAttackCooldown;
    }

    dashSkill(){
        if(this.dashCooldown <= 0 && this.MANA >= this.dashManaCost){
            this.MANA -= this.dashManaCost;

            let adjacent = this.mouseX-this.posX-this.sizeX*0.5; // calcul angle de dash depuis le centre
            let oppose = this.mouseY-this.posY-this.sizeY*0.5;
            let hypotenuse = Math.hypot(oppose,adjacent);

            let sinDash = oppose/hypotenuse; 
            let cosDash = adjacent/hypotenuse;

            if(this.dashIsControlable == true){ // le dash est une accélération 
                this.accelerationX = cosDash*this.dashAcceleration;
                this.accelerationY = sinDash*this.dashAcceleration;
                this.dashCooldown = this.dashBaseCooldown;
                this.vitesseActuelle = 0;
            }
        }
    }

    // --------------------------

    removeInstance(){
        pause();
        document.getElementById("ecranDeMort").style.display = "flex";
    }
}

class Projectiles {
    
    isActive = true;
    vitesse = 3;
    range = 500;
    distanceParcourue = 0;
    sinTarget = 0;
    cosTarget = 0;
    recul = 5;
    radius = 10;
    color = "#F4D35E";
    cibles = monsters; // tableau contenant les cibles potentiels de l'attaque par défaut les monstres
    
    constructor(source,cibles,targetX,targetY,radius = 10,range = 500,color = "#F4D35E",vitesse = 3,isAera = false){
        // Options en paramètres
        this.range = range;
        this.radius = radius;
        this.color = color;
        this.vitesse = vitesse;
        this.isAera = isAera;

        this.DMG = source.DMG;
        if(isAera == true){
            this.DMG *= 0.01;
        }

        this.source = source; // Tireur du projectile
        this.posX = source.posX+source.sizeX/2; // centre du tireur
        this.posY = source.posY+source.sizeY/2;

        this.targetX = targetX;    // change la position que le player doit rejoindre
        this.targetY = targetY;       
        // note l'orientation relative à target
        let adjacent = targetX-this.posX;
        let oppose = targetY-this.posY;
        let hypotenuse = Math.hypot(oppose,adjacent);

        this.sinTarget = oppose/hypotenuse; 
        this.cosTarget = adjacent/hypotenuse;

        this.posX += source.sizeX*this.cosTarget*0.6; // ellispe autour du tireur pour que le projectile ne sorte pas de celui ci
        this.posY += source.sizeY*this.sinTarget*0.6;

        this.cibles = cibles;

        projectiles.push(this); // ajout à la liste des projectiles
    }

    updateMovements(){
        if(this.isActive){
            this.posX += this.vitesse*this.cosTarget; // Vitesse horizontale
            this.posY += this.vitesse*this.sinTarget; // Vitesse verticale
            this.distanceParcourue += this.vitesse;
            if(this.distanceParcourue>=this.range){
                this.removeInstance(); // Enleve le projectile du rendu ne fonctionne que si la vitesse des projectiles est fixe
            }
        }
    }

    updateRendering(){
        if(this.isActive){
            ctx.beginPath();
            ctx.arc(this.posX, this.posY, this.radius, 0, 2 * Math.PI);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.closePath()  
        }
    }

    removeInstance(){
        this.isActive = false;
    }

    checkCollision(){
        if(this.isActive){ 
            for(let index in this.cibles){
            let monster = this.cibles[index];
            if(monster.isAlive){

                let xmin = monster.posX;
                let xmax = monster.posX + monster.sizeX;

                let ymin = monster.posY;
                let ymax = monster.posY + monster.sizeY;

                if(isInContact(this.posX,this.posY,this.radius,xmin,xmax,ymin,ymax)){
                    
                    // recul du tir
                    if(this.isAera ==false){ // les sorts de zone ne repoussent pas les ennemis
                        monster.accelerationX += this.recul*this.cosTarget;
                        monster.accelerationY += this.recul*this.sinTarget;
                    }
                    
                    dammageCalculator(monster,this);

                    if(this.isAera == false){ // les sorts de zone traversent les ennemis
                        this.removeInstance()
                    }
                    }
                }
            }
        }
    }
}

class Monster{

    // Stats
    LVL = 1;
    PDV = 50 + 10*this.LVL;
    PDVMAX = this.PDV;
    DMG = 20 + 5*this.LVL;
    RANGE = 30;
    currentAttackCooldown = 0;
    baseAttackCooldown = framePerSeconds(1); // en nb de frames
    recul = 5;
    EXPbounty = 50 +10*this.LVL;

    // Physique
    vitesse = 0.6 +this.LVL*0.01;
    vitesseDeBase = 0.6 +this.LVL*0.01;
    posX = Math.random()*canvas.width; // Point d'apparition
    posY = Math.random()*0.5*canvas.height; // dans la moitié supérieure
    accelerationX = 0;
    accelerationY = 0;
    sizeX = 50;
    sizeY = 50;

    // Etats
    isAlive = true;
    color = "#462255";

    // Autres
    tempsInvocation = framePerSeconds(1); // Une seconde avant que les monstres commencent à bouger

    constructor(){
        monsters.push(this);
        this.LVL = depth;
    }

    // Types de monstres
    isTank(){
        this.color = "#3D3522";
        this.sizeX *= 2;
        this.sizeY *= 2;
        this.PDV *= 2;
        this.PDVMAX *= 2;
        this.RANGE *= 3;
        this.vitesseDeBase *= 0.75;
        this.recul *= -0.5; // attire le joueur quand il attaque
    }

    isRunner(){
        this.color = "#FFCF00";
        this.sizeX *= 0.5;
        this.sizeY *= 0.5;
        this.PDV *= 0.5;
        this.PDVMAX *= 0.5;
        this.RANGE *= 0.5;
        this.vitesseDeBase *= 1.5;
        this.recul *= 0.5; // attire le joueur quand il attaque
    }

    isRepulso(){
        this.color = "#7022AA";
        this.sizeX *= 3;
        this.sizeY *= 3;
        this.RANGE = player.sizeX/2;
        this.vitesseDeBase = 0;
        this.recul = 30;
    }

    // Fonctions Générales
    updateMovements(){
        if(this.isAlive){

            if(this.tempsInvocation > 0){ // Les monstres sonts immobiles pendant une seconde après leur invocation
                this.tempsInvocation -= 1;
                this.vitesse = 0;
            }

            let oldX = this.posX;
            let oldY = this.posY;

            this.targetX = player.posX;
            this.targetY = player.posY;
            // note l'orientation relative à target
            let adjacent = this.targetX-this.posX;
            let oppose = this.targetY-this.posY;
            let hypotenuse = Math.hypot(oppose,adjacent);

            this.sinTarget = oppose/hypotenuse; 
            this.cosTarget = adjacent/hypotenuse;

            if(hypotenuse <= this.RANGE){ // Le monstre doit s'arreter avant d'etre dans le joueur
                this.vitesse = 0;
            }

            this.posX += this.vitesse*this.cosTarget +this.accelerationX;
            this.posY += this.vitesse*this.sinTarget +this.accelerationY;

            this.vitesse = this.vitesseDeBase;

            if(entityColumnCheck(this,0,canvas.width) == false){ 
                // si on va dépasser la limite de l'ecran on colle le monstre au bord
                this.posX = oldX;
            }
    
            if(entityRowCheck(this,0,canvas.height) == false){ 
                // si on va dépasser la limite de l'ecran en ligne on annule le dernier mouvement sur Y :
                this.posY = oldY;
            }

            updateAcceleration(this);
        }
    }

    updateRendering(){
        if(this.isAlive){
            let PDVpercentage = (this.PDV/this.PDVMAX).toFixed(2);
            ctx.beginPath();
            ctx.rect(this.posX,this.posY-10,this.sizeX*PDVpercentage,5); // barre de pdv
            ctx.fillStyle = "#800E13";
            ctx.fill();
            ctx.closePath();

            ctx.beginPath();
            ctx.rect(this.posX,this.posY,this.sizeX,this.sizeY);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.closePath();
        }
    }

    checkCollision(){ // attaque le joueur au "corps à corps"
        if(this.isAlive){
            let xmin = this.posX - this.RANGE;
            let xmax = this.posX + this.sizeX + this.RANGE;

            let ymin = this.posY - this.RANGE;
            let ymax = this.posY + this.sizeY + this.RANGE;

            let x = player.posX+player.sizeX/2; // le centre du joueur
            let y = player.posY+player.sizeY/2;

            if(this.currentAttackCooldown <= 0){
                if (isInside(x,y,xmin,xmax,ymin,ymax) == true){
                        
                    // recul de l'attaque
                    player.accelerationX += this.recul*this.cosTarget;
                    player.accelerationY += this.recul*this.sinTarget;
                        
                    dammageCalculator(player,this);

                    this.currentAttackCooldown = this.baseAttackCooldown;
                }
            }
            else{
                this.currentAttackCooldown -= 1;
            }
        }
    }
    
    removeInstance(){
        this.isAlive = false;
        // entre les salles il faut supprimer la liste pas les monstres
        player.EXP += this.EXPbounty;
    }
}

class Map{
    // Determine le nombre de chemins entre 2 et 4
    nbPorte = Math.round(Math.random*3 + 1);
    // De 1 à 8 monstre par map la difficulté est répartie entre les monstres
    nbMonster = Math.round(Math.random*7+1) 

    constructor(){
        

    }

    updateRendering(){

    }
}

let player = new Player();
let players = [player];
new Monster();

let testTank = new Monster();
testTank.isTank();

let testRunner = new Monster();
testRunner.isRunner();

let testRepulso = new Monster();
testRepulso.isRepulso();

// new Monster();
// new Monster();
// new Monster();

player.addMovementsListeners();

function setFrameUpdater(){
    // Calcul des mouvements
    player.updateMovements();
    player.updateCooldowns();
            
    projectiles.forEach(projectile => projectile.updateMovements());
    projectiles.forEach(projectile => projectile.checkCollision());
            
    monsters.forEach(monster => monster.updateMovements());
    monsters.forEach(monster => monster.checkCollision());

    //Effacage du canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    //Rendu
            
    projectiles.forEach(projectile => projectile.updateRendering());
    monsters.forEach(monster => monster.updateRendering());
    player.updateRendering();
}

var frameUpdater = window.setInterval(setFrameUpdater, frameDuration); // 120 FPS
     
document.addEventListener('keydown', logKey);
function logKey(e) {
    if(e.key == 'Enter' && gameIsPaused == true){
        frameUpdater = window.setInterval(setFrameUpdater, frameDuration); // 120 FPS
        gameIsPaused = false;
        return 0;
    }
    if(e.key == 'p' && gameIsPaused == false){
        clearInterval(frameUpdater);
        gameIsPaused = true;
        return 0;
    }
    if(e.key == 'p' && gameIsPaused == true){
        frameUpdater = window.setInterval(setFrameUpdater, frameDuration); // 120 FPS
        gameIsPaused = false;
        return 0;
    }
    if(e.key == 'a' && gameIsPaused == false){
        player.combatSkill();
    }
    if(e.key == 'z' && gameIsPaused == false){
        player.buffSkill();
    }
    if(e.key == 'e' && gameIsPaused == false){
        player.dashSkill();
    }
}