
// initializing variables
if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

// webGL stuff
var container, stats;
var camera, scene, renderer;
var mesh, geometry;
var loader;
var pointLight;

var mouseX = 0;
var mouseY = 0;
var mousePosition = new THREE.Vector3( );

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

// DOMs
var pointsDOM;
var mousePositionDOM;
var cumulatedFrameTimeDOM;


// materials
var matAttackMissile = new THREE.MeshPhongMaterial( { color: 0xa9a9a9, specular:0xaa0000, combine: THREE.MixOperation, reflectivity: 0.25 } ); // dark grey
var matDefendMissile = new THREE.MeshPhongMaterial( { color: 0xd3d3d3, specular:0xaa0000, combine: THREE.MixOperation, reflectivity: 0.25 } ); // light grey
var matBattery = new THREE.MeshPhongMaterial( { color: 0xDEB887, specular:0xaa0000, combine: THREE.MixOperation, reflectivity: 0.25 } );
var matCity = new THREE.MeshBasicMaterial( {color: 0xDAA520 , wireframe:true} );

// game const
const TILE_SIZE = 10;
const ATTACKSTEPTIME = 1000; // drop missile per 3 sec
const ATTACKSPEED = 5; // 10*1000 = 10px/s
const DEFENDSPEED = 50;

const SCREEN_Z = 0; // z value for the plane
const SCREEN_TOP = 800; // screen top 800
const SCREEN_BOTTOM = -600; // screen bottom -1000
const SCREEN_LEFT = -1300; // screen BORDERLEFT -1300
const SCREEN_RIGHT = 1300; // screen BORDERIGHT 1300

var batteryXPos = [-900, 0 ,900];

// game variables
var gameOver = false;
var startTime = Date.now(); //timestamp
var frameTime = 0; // ms
var cumulatedFrameTime = 0 //ms
var _lastFrameTime = Date.now(); //timestamp

var currentPoints = 0; // score keeping

var attackMissiles = []; // descending missiles
var defendMissiles = []; // ascending missiles
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
	pointsDOM.innerHTML = "Points: " + Tetris.currentPoints;
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
	// create camera
	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 5000 );
	camera.position.z = 2000;
	camera.position.y = 500; //1000

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

	// LIGHTS

	var ambient = new THREE.AmbientLight( 0xffffff );
	scene.add( ambient );

	pointLight = new THREE.PointLight( 0xffffff, 1 );
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

	// add models to the scene
	var s = 5;
	
	// batteries
	geometry =  new THREE.CylinderGeometry( 1, TILE_SIZE*3, TILE_SIZE*3, 4 );
	for (var i=0; i<batteryXPos.length; i++) {
		var mesh = new THREE.Mesh( geometry, matBattery );
		mesh.position.set(batteryXPos[i],SCREEN_BOTTOM,0);
		mesh.scale.x = mesh.scale.y = mesh.scale.z = s;
		scene.add( mesh );
	}
	
	// cities: https://stackoverflow.com/questions/26418591/how-to-make-a-rectangular-pyramid-in-three-js-r68
	var cityXPos = [-600, -450, -300, 300, 450, 600];
	geometry = new THREE.BoxGeometry( 20, 20, 20 );
	for (var i=0; i<cityXPos.length; i++) {
		var mesh = new THREE.Mesh( geometry, matCity );
		mesh.position.set(cityXPos[i],SCREEN_BOTTOM,0);
		mesh.scale.x = mesh.scale.y = mesh.scale.z = s;
		scene.add( mesh );
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
		0.5 );

	vector.unproject( camera );
	var dir = vector.sub( camera.position ).normalize();
	var distance = - camera.position.z / dir.z;
	mousePosition = camera.position.clone().add( dir.multiplyScalar( distance ) );

}

function onDocumentMouseClick(event) {
	// add bullet
	createDefendMissile(mousePosition);
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
		attackMissile.lookAt(attackMissile.userData.direction);
		
		// TODO rotate the mesh
		//TODO add particle smoke after it
		attackMissiles.push(attackMissile);
		scene.add(attackMissile);
		//console.log(attackMissiles);
}

// destination: THREE.Vector3
function createDefendMissile(destination) {
		var geometry = new THREE.SphereGeometry( 30, 16, 16 );
		geometry.applyMatrix( new THREE.Matrix4().makeScale( 1.0, 1.0, 2.0 ) ); // make it ellipsoid
		var defendMissile = new THREE.Mesh( geometry, matDefendMissile );
		
		//TODO calculate where to shoot from
		defendMissile.userData.startPt = closestBatteryLocation(destination);
		defendMissile.userData.endPt = new THREE.Vector3( destination.x, destination.y, SCREEN_Z);
		defendMissile.userData.startTime = Date.now();
		defendMissile.position.copy(defendMissile.userData.startPt);
		defendMissile.userData.direction = new THREE.Vector3();
		defendMissile.userData.direction.subVectors(defendMissile.userData.endPt, defendMissile.userData.startPt);
		defendMissile.lookAt(defendMissile.userData.direction);
		
		// TODO rotate the mesh
		//TODO add particle smoke after it
		defendMissiles.push(defendMissile);
		scene.add(defendMissile);
		console.log(defendMissiles);
}

// choose the closest battery by x distance
function closestBatteryLocation(position) {
	var batteryXDis = batteryXPos.slice(); // create a copy of battery x coord
	// calculate distance (x-axis) from battery to clicked location
	batteryXDis = Array.from(batteryXDis, x => Math.abs(position.x - x)); 

	var indexOfMinX = batteryXDis.indexOf( Math.min(...batteryXDis) );
	//console.log(batteryXPos[indexOfMinX]);

	//TODO +20 change to model num
	var closestLocation = new THREE.Vector3(batteryXPos[indexOfMinX], SCREEN_BOTTOM+20, SCREEN_Z);
	return closestLocation;
}
// animate for each frame
// http://www.smashinglabs.pl/3d-tetris-with-three-js-tutorial-part-1

function animate() {
	var currentTime = Date.now();
	frameTime = currentTime - _lastFrameTime;
	_lastFrameTime = currentTime;
	cumulatedFrameTime += frameTime;
	
	while(cumulatedFrameTime > ATTACKSTEPTIME) {
		cumulatedFrameTime -= ATTACKSTEPTIME;
		
		// every step time, add new attacking missile
		createAttackMissile();
	}
	
	// change state of each attack missile
	for (var whichMissile=0; whichMissile<attackMissiles.length; whichMissile++) {
		var curMissile = attackMissiles[whichMissile];
		
		// move current missile
		curMissile.position.addScaledVector(curMissile.getWorldDirection(), ATTACKSPEED);
		
		// remove missiles when they hit ground
		if (curMissile.position.y <= SCREEN_BOTTOM) {
			//TODO add explosion
			scene.remove(curMissile);
			attackMissiles.splice(whichMissile, 1);
		}
	}
	
	// change state of each defend missile
	for (var whichMissile=0; whichMissile<defendMissiles.length; whichMissile++) {
		var curMissile = defendMissiles[whichMissile];
		
		// move current missiles
		curMissile.position.addScaledVector(curMissile.getWorldDirection(), DEFENDSPEED);
		
		// remove missiles when they hit top
		if (curMissile.position.y >= SCREEN_TOP) {
			//TODO add explosion
			scene.remove(curMissile);
			defendMissiles.splice(whichMissile, 1);
		}
	}
	
	
	// render
	render();
	stats.update();
	if(!gameOver) requestAnimationFrame( animate );

	
}

function render() {

	var timer = -0.0002 * Date.now();

	//pointLight.position.x = 1500 * Math.cos( timer );
	//pointLight.position.z = 1500 * Math.sin( timer );

	camera.position.x += ( mouseX - camera.position.x ) * .05;
	camera.position.y += ( - mouseY - camera.position.y ) * .05;
	mousePositionDOM.innerHTML = "x: " + mousePosition.x + " y: " + mousePosition.y;
	cumulatedFrameTimeDOM.innerHTML = "cumulatedFrameTime: " + cumulatedFrameTime;

	camera.lookAt( scene.position );

	renderer.render( scene, camera );

}

