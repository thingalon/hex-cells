import './style.css';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Load the entirity of a GLTF file. They typically include a Scene of their own.
 */
async function loadGltfFile( path: string ): Promise< GLTF > {
	return new Promise( ( resolve, reject ) => {
		new GLTFLoader().load( path, resolve, undefined, reject );
	} );
}

/**
 * Load a specific model from a GLTF file (by name).
 */
async function loadModelFromGltf( path: string, name: string ): Promise< THREE.Object3D > {
	const gltf = await loadGltfFile( path );
	const object = gltf.scene.getObjectByName( name );
	if ( ! object ) {
		throw new Error( 'Object not found: ' + name );
	}

	return object;
}

/**
 * Given an x, y grid position, return the Vector3 location of the center of that hex.
 */
function gridToPosition( x: number, y: number ): THREE.Vector3 {
	const rowWidth = 1.73206;
	const rowHeight = 1.51;

	const isEvenRow = y % 2 === 0;
	const centerX = x * rowWidth - ( isEvenRow ? rowWidth / 2 : 0 );
	const centerY = y * rowHeight;

	return new THREE.Vector3( centerX, 0, centerY );
}

/**
 * Apply a material change to a model.
 */
function changeMaterialColor( model: THREE.Object3D, materialName: string, color: THREE.Color ) {
	model.traverse( child => {
		if ( child instanceof THREE.Mesh && child.material.name === materialName ) {
			child.material = child.material.clone();
			child.material.color = color;
		}
	} );
}

async function main() {
	// Create a THREEJS renderer
	const renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( window.devicePixelRatio );
	document.getElementById( 'app' )?.appendChild( renderer.domElement );

	// Set up 3d scene and camera.
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
	camera.position.set( 3, 10, 3 );
	camera.lookAt( 0, 0, 0 );

	// Add some basic lighting.
	const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x77, 1.5 );
	hemiLight.position.set( 0, 1, 0 );
	scene.add( hemiLight );

	const dirLight = new THREE.DirectionalLight( 0xffffff, 3 );
	dirLight.position.set( 5, 5, 5 );	
	scene.add( dirLight );

	// Load a 3d model.
	const hexModel = await loadModelFromGltf( '/hex.glb', 'hex' );

	// Create some different colour materials for the tops of the hexes.
	const water = new THREE.Color( 0x1133cc );
	const grass = new THREE.Color( 0x009900 );
	const sand = new THREE.Color( 0xffdd77 );

	// Create a grid of them.
	for ( let x = -3; x <= 3; x++ ) {
		for ( let y = -3; y <= 3; y++ ) {
			const model = hexModel.clone();
			model.position.copy( gridToPosition( x, y ) );

			// Pick a color.
			const color = x < -1 ? water : x > -1 ? grass : sand;

			changeMaterialColor( model, 'Top', color );

			scene.add( model );
		}
	}

	// Keep the scene rotating around the center.
	function animate() {
		requestAnimationFrame( animate );

		// Rotate the camera in circles around the Y axis.
		camera.position.x = Math.sin( Date.now() / 3000 ) * 10;
		camera.position.z = Math.cos( Date.now() / 3000 ) * 10;
		camera.lookAt( 0, 0, 0 );
	
		renderer.render( scene, camera );
	}
	animate();

	// Detect clicks on a hex.
	window.addEventListener( 'click', ( event ) => {
		// Get the mouse position in normalized device coordinates (-1 to +1).
		const mouse = new THREE.Vector2();
		mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
		mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

		// Raycast from the camera to the mouse position.
		const raycaster = new THREE.Raycaster();
		raycaster.setFromCamera( mouse, camera );

		// Find the first object that intersects with the ray.
		const intersects = raycaster.intersectObjects( scene.children, true );
		if ( intersects.length > 0 ) {
			// Clicked on an object. Walk up the tree to find the hex.
			let object: THREE.Object3D | null = intersects[ 0 ].object;
			while ( object ) {
				if ( object.name === 'hex' ) {
					// Have a cliked hex. Give it a new random color.
					changeMaterialColor( object, 'Top', new THREE.Color( Math.random(), Math.random(), Math.random() ) );
				}
				object = object.parent;
			}
		}
	} );
}

main().catch( err => console.error( err ) );
