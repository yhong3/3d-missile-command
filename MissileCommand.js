
// initializing variables
if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

// webGL stuff
var container, stats;
var camera, scene, renderer;
var mesh, geometry;
var loader;
var pointLight;
var options, spawnerOptions, particleSystem;
var tick = 0;
var clock = new THREE.Clock();


var mouseX = 0;
var mouseY = 0;
var mousePosition = new THREE.Vector3( );

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

// DOMs
var pointsDOM;
var mousePositionDOM;
var cumulatedFrameTimeDOM;

var sounds = {};

// materials
var matAttackMissile = new THREE.MeshPhongMaterial( { color: 0x800000, specular:0xaa0000, combine: THREE.MixOperation, reflectivity: 0.25 } ); // dark red
var matDefendMissile = new THREE.MeshPhongMaterial( { color: 0xd3d3d3, specular:0xa9a9a9, combine: THREE.MixOperation, reflectivity: 0.25 } ); // light grey
var matBattery = new THREE.MeshPhongMaterial( { color: 0xDEB887, specular:0xaa0000, combine: THREE.MixOperation, reflectivity: 0.25 } );
var matCity = new THREE.MeshPhongMaterial( {color: 0xDEB887 , specular:0xaa0000, wireframe:false, combine: THREE.MixOperation, reflectivity: 0.25} );

// game const
const TILE_SIZE = 10;
const ATTACKSTEPTIME = 1000; // drop missile per 1 sec
const ATTACKSPEED = 5; // 10*1000 = 10px/s
const DEFENDSPEED = 50;
const SPACESHIPSPEED = 10;
const SPACESHIPSTEPTIME = 3000; // 3s
const EXPLOSION_RADIUS = 40;
const MISSILE_SIZE = 20;

const SCREEN_Z = 0; // z value for the plane
const SCREEN_TOP = 800; // screen top 800
const SCREEN_BOTTOM = -600; // screen bottom -1000
const SCREEN_LEFT = -1300; // screen BORDERLEFT -1300
const SCREEN_RIGHT = 1300; // screen BORDERIGHT 1300
const SPACESHIP_MAXHEIGHT = 400;
const SCORE_CITYHIT = -10;
const SCORE_DEFENDED = +10;
const SCORE_BATTERYHIT = -50;
const SCORE_SPACESHIP = +100;

const EXPLOSIONSTEP = 0.1;
// game variables
var gameOver = false;
var startTime = Date.now(); //timestamp
var frameTime = 0; // ms
var cumulatedFrameTime = 0 //ms
var cumulatedFrameTime2 = 0 //ms

var _lastFrameTime = Date.now(); //timestamp

var currentPoints = 0; // score keeping

var batteryXPos = [-900, 0 ,900];
var cities = [];
var batteries = [];
var spaceships = [];
var cityCount = 0;
var batteryCount = 0;
var attackMissiles = []; // descending missiles
var defendMissiles = []; // ascending missiles
var collidableMesh = [];
var explosions = [];
var raycaster = new THREE.Raycaster();

//


/* start classes */
document.addEventListener('mousemove', onDocumentMouseMove, false);
document.addEventListener('click', onDocumentMouseClick, false);
start();

function start() {	
	pointsDOM = document.getElementById("points");
	mousePositionDOM = document.getElementById("mousePosition");
	cumulatedFrameTimeDOM = document.getElementById("cumulatedFrameTime");

	init();
	animate();
}

// add points
function addPoints(n) {
	currentPoints += n;
	pointsDOM.innerHTML = "Points: " + currentPoints;
} // end add points

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

function init() {
	
	container = document.createElement( 'div' );
	document.body.appendChild( container );
	
    sounds["gamestart"] = document.getElementById("audio_gamestart");  
    sounds["explosion"] = document.getElementById("audio_explosion");  
    sounds["shoot"] = document.getElementById("audio_shoot");  
    sounds["gameover"] = document.getElementById("audio_gameover");  
    sounds["score"] = document.getElementById("audio_score");  
    sounds["doomed"] = document.getElementById("audio_doomed");  
    
    sounds["gamestart"].play();
    
    // create camera
	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 5000 );
	camera.position.z = 2000;
	camera.position.y = 0; //1000

	camera.isPerspectiveCamera = false;

	// create skybox
	var path = "examples/textures/cube/skybox/";
	var format = '.jpg';
	var urls = [
			path + 'px' + format, path + 'nx' + format,
			path + 'py' + format, path + 'ny' + format,
			path + 'pz' + format, path + 'nz' + format
		];

	var reflectionCube = new THREE.CubeTextureLoader().load( urls );
	reflectionCube.format = THREE.RGBFormat;

	scene = new THREE.Scene();
	scene.background = reflectionCube;
	
	particleSystem = new THREE.GPUParticleSystem( {
		maxParticles: 250000
	} );
	scene.add( particleSystem );

	options = {
		position: new THREE.Vector3(),
		positionRandomness: 3, //.3
		velocity: new THREE.Vector3(),
		velocityRandomness: 3,
		color: 0xff4500,
		colorRandomness: .2,
		turbulence: 0, //.5
		lifetime: 3, //1
		size: 20,
		sizeRandomness: 1
	};
	
	spawnerOptions = {
	spawnRate: 3000, // 15000
	horizontalSpeed: 1.5, //1.5
	verticalSpeed: 1.33, //1.33
	timeScale: 1
};
	
	// LIGHTS

	var ambient = new THREE.AmbientLight( 0xffffff );
	scene.add( ambient );

	pointLight = new THREE.PointLight( 0xffffff, .5 );
	camera.add( pointLight );
	scene.add( pointLight );

	// material



	// create renderer

	renderer = new THREE.WebGLRenderer();
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );

	// monitor fps stats

	stats = new Stats();
	container.appendChild( stats.dom );

	// load obj

	//loader = new THREE.BinaryLoader();
	//loader.load( "examples/obj/walt/WaltHead_bin.js", function( geometry ) { createScene( geometry ) } );
	//
	var geometry;
	createScene(geometry);
	window.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {

	windowHalfX = window.innerWidth / 2;
	windowHalfY = window.innerHeight / 2;

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

function createScene( geometry ) {

    // add terrain
    geometry =  new THREE.PlaneGeometry(3000, 3000);
    var planeMaterial = new THREE.MeshBasicMaterial( {color: 0xc2b280, side: THREE.DoubleSide} ); //sand color
    var plane = new THREE.Mesh( geometry, planeMaterial );
    plane.rotateX(Math.PI/2);
    plane.position.set(0,SCREEN_BOTTOM-60,0);
    scene.add( plane );
	
	// add models to the scene
	var s = 5;
	
	// batteries
	geometry =  new THREE.CylinderGeometry( 1, TILE_SIZE*3, TILE_SIZE*3, 4 );
	for (var i=0; i<batteryXPos.length; i++) {
		var mesh = new THREE.Mesh( geometry, matBattery );
		mesh.position.set(batteryXPos[i],SCREEN_BOTTOM,0);
		mesh.scale.x = mesh.scale.y = mesh.scale.z = s;
        mesh.userData.type = 'battery';
		batteries.push(mesh);
        batteryCount++;
        collidableMesh.push(mesh);
        scene.add( mesh );
	}
	
	// cities: https://stackoverflow.com/questions/26418591/how-to-make-a-rectangular-pyramid-in-three-js-r68
	var cityXPos = [-600, -450, -300, 300, 450, 600];
	geometry = new THREE.BoxGeometry( 20, 20, 20 );
	for (var i=0; i<cityXPos.length; i++) {
		var mesh = new THREE.Mesh( geometry, matCity );
		mesh.position.set(cityXPos[i],SCREEN_BOTTOM,0);
		mesh.scale.x = mesh.scale.y = mesh.scale.z = s;
        mesh.userData.type = 'city';
        cities.push(mesh);
        cityCount++;
        collidableMesh.push(mesh);
		scene.add( mesh );
        //console.log(cities);
	}

}

function onDocumentMouseMove(event) {
	// view rotation with mouse move 
	mouseX = ( event.clientX - windowHalfX ) * 4;
	mouseY = ( event.clientY - windowHalfY ) * 4;
	
	// get mouse position world coordination
	// https://stackoverflow.com/questions/13055214/mouse-canvas-x-y-to-three-js-world-x-y-z
	var vector = new THREE.Vector3();
	vector.set(
		( event.clientX / window.innerWidth ) * 2 - 1,
		- ( event.clientY / window.innerHeight ) * 2 + 1,
		.5 );

	vector.unproject( camera );
	var dir = vector.sub( camera.position ).normalize();
	var targetZ = SCREEN_Z;
	var distance = (targetZ - camera.position.z) / dir.z;
	mousePosition = camera.position.clone().add( dir.multiplyScalar( distance ) );

}

function onDocumentMouseClick(event) {
    if (!gameOver) {
        // add bullet
        sounds["shoot"].play();
        createDefendMissile(mousePosition);
    }
}

function createSpaceship() {
    
	var geometry = new THREE.BoxGeometry( 15, 15, 30 );
    var matSpaceship = new THREE.MeshPhongMaterial( { color: 0x9400d3, specular:0xe6e6fa, combine: THREE.MixOperation, reflectivity: 0.25 } ); // purple

	var mesh = new THREE.Mesh( geometry, matSpaceship );
    var spaceshipHeight = getRandomInt(SCREEN_TOP, SPACESHIP_MAXHEIGHT);
    
    var startFromLeft = Math.round(Math.random());
    //console.log('start from left='+startFromLeft );
    switch(startFromLeft) {
        case 1:
            mesh.userData.startPt = new THREE.Vector3( SCREEN_LEFT, spaceshipHeight, SCREEN_Z);
            mesh.userData.endPt = new THREE.Vector3(  SCREEN_RIGHT, spaceshipHeight, SCREEN_Z);
            break;
        case 0:
            mesh.userData.startPt = new THREE.Vector3( SCREEN_RIGHT, spaceshipHeight, SCREEN_Z);
            mesh.userData.endPt = new THREE.Vector3(  SCREEN_LEFT, spaceshipHeight, SCREEN_Z);
            break;
 
    }
    mesh.userData.startTime = Date.now();
	mesh.position.copy(mesh.userData.startPt);
	mesh.userData.direction = new THREE.Vector3();
	mesh.userData.direction.subVectors(mesh.userData.endPt, mesh.userData.startPt);
	mesh.lookAt(mesh.userData.endPt);
	
	mesh.userData.type = 'spaceship';
    spaceships.push(mesh);
	scene.add(mesh);
}

function createAttackMissile() {
	var geometry = new THREE.SphereGeometry( 30, 16, 16 );
	geometry.applyMatrix( new THREE.Matrix4().makeScale( 1.0, 1.0, 2.0 ) ); // make it ellipsoid
	var attackMissile = new THREE.Mesh( geometry, matAttackMissile );
	attackMissile.userData.startPt = new THREE.Vector3( getRandomInt(SCREEN_LEFT, SCREEN_RIGHT), 
														SCREEN_TOP, SCREEN_Z);
	attackMissile.userData.endPt = new THREE.Vector3( getRandomInt(SCREEN_LEFT, SCREEN_RIGHT), 
														SCREEN_BOTTOM, SCREEN_Z);
	attackMissile.userData.startTime = Date.now();
	attackMissile.position.copy(attackMissile.userData.startPt);
	attackMissile.userData.direction = new THREE.Vector3();
	attackMissile.userData.direction.subVectors(attackMissile.userData.endPt, attackMissile.userData.startPt);
	attackMissile.lookAt(attackMissile.userData.endPt);
	
	//TODO add particle smoke after it
	attackMissile.userData.type = 'attackMissile';
    attackMissiles.push(attackMissile);
	scene.add(attackMissile);
	//console.log(attackMissiles);
}

// destination: THREE.Vector3
function createDefendMissile(destination) {
	geometry = new THREE.SphereGeometry( 30, 16, 16 );
	geometry.applyMatrix( new THREE.Matrix4().makeScale( 1.0, 1.0, 2.0 ) ); // make it ellipsoid
	var defendMissile = new THREE.Mesh( geometry, matDefendMissile );
	
	defendMissile.userData.startPt = closestBatteryLocation(destination);
	defendMissile.userData.endPt = new THREE.Vector3( destination.x, destination.y, SCREEN_Z);
	defendMissile.userData.startTime = Date.now();
	defendMissile.position.copy(defendMissile.userData.startPt);
	defendMissile.userData.direction = new THREE.Vector3();
	defendMissile.userData.direction.subVectors(defendMissile.userData.endPt, defendMissile.userData.startPt);
	defendMissile.lookAt(defendMissile.userData.endPt);
	
	//TODO add particle smoke after it
	defendMissile.userData.type = 'defendMissile';
    defendMissiles.push(defendMissile);
    collidableMesh.push(defendMissile);
	scene.add(defendMissile);
	//console.log(defendMissiles);
}

// choose the closest battery by x distance
function closestBatteryLocation(position) {
	var batteryXDis = [];
    for (var i=0; i<batteries.length; i++) {
        batteryXDis.push(batteries[i].position.x);
    }
	
    //var batteryXDis = batteryXPos.slice(); // create a copy of battery x coord
	// calculate distance (x-axis) from battery to clicked location
	batteryXDis = Array.from(batteryXDis, x => Math.abs(position.x - x)); 

	var indexOfMinX = batteryXDis.indexOf( Math.min(...batteryXDis) );
	//console.log(batteryXPos[indexOfMinX]);

	//TODO +20 change to model num
	var closestLocation = new THREE.Vector3(batteries[indexOfMinX].position.x, SCREEN_BOTTOM, SCREEN_Z);
	return closestLocation;
}
// animate for each frame
// http://www.smashinglabs.pl/3d-tetris-with-three-js-tutorial-part-1

function moveMissile(missile, speed) {
	// move current missile
	missile.position.addScaledVector(missile.getWorldDirection(), speed);
	
	return missile;
}

function checkAttackMissileCollision() {
    for (var whichMissile=0; whichMissile<attackMissiles.length; whichMissile++) {
		var curMissile = attackMissiles[whichMissile];
        
		// move missile
		curMissile.position.addScaledVector(curMissile.getWorldDirection(), ATTACKSPEED);
		
		// collision check on cities
        for (var i=0; i<collidableMesh.length; i++) {
            var curMesh = collidableMesh[i];
            if ( curMissile.position.distanceTo(curMesh.position) <= (EXPLOSION_RADIUS)) {
                // current collidable object is hit
                switch(curMesh.userData.type) {
                case 'city':
                    sounds["doomed"].play();
                    addPoints(SCORE_CITYHIT);
                    animateExplosion(curMesh.position);
                    
                    // remove city
                    scene.remove(curMesh);
                    cities.splice(cities.indexOf(curMesh), 1);
                    collidableMesh.splice(i,1);
                    cityCount--;                    
                    break;
                case 'battery':
                    sounds["doomed"].play();
                    addPoints(SCORE_CITYHIT);
                    animateExplosion(curMesh.position);
                    
                    // remove city
                    // remove missile
                    scene.remove(curMesh);
                    batteries.splice(batteries.indexOf(curMesh), 1);
                    
                    collidableMesh.splice(i,1);
                    batteryCount--;
                    break;
                case 'defendMissile':
                    sounds["explosion"].play();
                    addPoints(SCORE_DEFENDED);
                    animateExplosion(curMesh.position);

                    scene.remove(curMesh);
                    defendMissiles.splice(defendMissiles.indexOf(curMesh), 1); 
                    collidableMesh.splice(i,1);
                    break;
                }
                
                scene.remove(curMissile);
                attackMissiles.splice(whichMissile, 1);
            }
        } // end of collidable mesh check  
        
        if (curMissile.position.y <= SCREEN_BOTTOM) { // collision on ground
                //TODO add explosion
                sounds["explosion"].play();
                scene.remove(curMissile);
                attackMissiles.splice(whichMissile, 1);
        }
	}
}

function checkSpaceshipCollision() {
    for (var whichSpaceship=0; whichSpaceship<spaceships.length; whichSpaceship++) {
		var curSpaceship = spaceships[whichSpaceship];
        
		// move spaceship
		curSpaceship.position.addScaledVector(curSpaceship.getWorldDirection(), SPACESHIPSPEED);
		
		// collision check on defendmissiles
        for (var i=0; i<defendMissiles.length; i++) {
            var curMesh = defendMissiles[i];
            if ( curSpaceship.position.distanceTo(curMesh.position) <= (EXPLOSION_RADIUS)) {
                // current collidable object is hit                
                sounds["explosion"].play();
                addPoints(SCORE_SPACESHIP);
                animateExplosion(curMesh.position);

                scene.remove(curMesh);
                defendMissiles.splice(defendMissiles.indexOf(curMesh), 1); 
                collidableMesh.splice(collidableMesh.indexOf(curMesh),1);
                
                scene.remove(curSpaceship);
                spaceships.splice(whichSpaceship, 1);
            
                break;
            }
        } // end of collidable mesh check  
            
        if (Math.abs(curSpaceship.position.x) >= SCREEN_RIGHT ) {
            scene.remove(curSpaceship);
            spaceships.splice(whichSpaceship, 1); 
        }
	}
}

function moveDefendMissile() {
    for (var whichMissile=0; whichMissile<defendMissiles.length; whichMissile++) {
        var curMissile = defendMissiles[whichMissile];

        // move current missiles
        curMissile.position.addScaledVector(curMissile.getWorldDirection(), DEFENDSPEED);

        // remove missiles when they hit top
        if (curMissile.position.y >= SCREEN_TOP) {
            scene.remove(curMissile);
            defendMissiles.splice(whichMissile, 1); 
            collidableMesh.splice(collidableMesh.indexOf(curMissile), 1)
        }
    
	}
}


function animateExplosion(position) {
    //TODO get delta
    /*
	if ( delta > 0 ) {
		options.position.x = position.x;
		options.position.y = position.y;
		options.position.z = position.z;
		for ( var x = 0; x < spawnerOptions.spawnRate * delta; x++ ) {
			particleSystem.spawnParticle( options );
		}
	}
    */
    var geometry = new THREE.SphereGeometry( 100, 16, 16 );
    var matExplosion = new THREE.MeshPhongMaterial( { color: 0xffb347, specular:0xaa0000, combine: THREE.MixOperation, reflectivity: 0.25 } ); // orange
	var mesh = new THREE.Mesh( geometry, matExplosion );
	mesh.position.copy(position);
    mesh.userData.currentScale = 1;
    explosions.push(mesh);
    scene.add(mesh);
}

function animate() {
	var currentTime = Date.now();
	frameTime = currentTime - _lastFrameTime;
	_lastFrameTime = currentTime;
	cumulatedFrameTime += frameTime;
    cumulatedFrameTime2 += frameTime;

	
	while(cumulatedFrameTime > ATTACKSTEPTIME) {
		cumulatedFrameTime -= ATTACKSTEPTIME;
		
		// every step time, add new attacking missile
		createAttackMissile();
	}
    
	while(cumulatedFrameTime2 > SPACESHIPSTEPTIME) {
		cumulatedFrameTime2 -= SPACESHIPSTEPTIME;
		
		// every step time, add new attacking missile
		createSpaceship();
	}
	
	// particle system
	var delta = clock.getDelta();
    tick += delta;
	if ( tick < 0 ) tick = 0;
	
	// change state of each attack missile
	checkAttackMissileCollision();
    moveDefendMissile();
    checkSpaceshipCollision();
    
    // explosion effect
    for (var i=0; i<explosions.length; i++) {
        var currentScale = explosions[i].userData.currentScale;
        if (currentScale <= EXPLOSIONSTEP) {
            scene.remove(explosions[i]);
            explosions.splice(i,1);
            continue;
        }
        currentScale -= EXPLOSIONSTEP;
        explosions[i].scale.set(currentScale, currentScale, currentScale);
        explosions[i].userData.currentScale = currentScale;
    }
    
    if (batteryCount == 0 || cityCount == 0) {
        gameOver = true;
    }
	// render
	particleSystem.update( tick );
	render();
	stats.update();
	if(!gameOver) {
        requestAnimationFrame( animate );
    } else {
        // show gameover msg
        var dialog = document.getElementById("dialog_gameover");
        dialog.showModal();
    }

}

function render() {

	var timer = -0.0002 * Date.now();

	//camera.position.x += ( mouseX - camera.position.x ) * .05;
	//camera.position.y += ( - mouseY - camera.position.y ) * .05;
	mousePositionDOM.innerHTML = "x: " + mousePosition.x + " y: " + mousePosition.y;
	cumulatedFrameTimeDOM.innerHTML = "cumulatedFrameTime: " + cumulatedFrameTime;

	camera.lookAt( scene.position );

	renderer.render( scene, camera );

}

