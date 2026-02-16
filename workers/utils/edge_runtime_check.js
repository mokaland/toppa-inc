
// This script is for demonstrating and testing Cloudflare Workers Edge Runtime characteristics.
// In a true Edge Runtime environment, Node.js global objects like `process` and `Buffer` are typically undefined.

function testEdgeRuntimeCompatibility() {
    let passed = true;
    console.log('Running Edge Runtime compatibility checks...');

    // Test for process object
    if (typeof process !== 'undefined') {
        console.log('FAIL: process object is defined. (Expected undefined in Edge Runtime)');
        passed = false;
    } else {
        console.log('PASS: process object is undefined. (Expected in Edge Runtime)');
    }

    // Test for Buffer object
    if (typeof Buffer !== 'undefined') {
        console.log('FAIL: Buffer object is defined. (Expected undefined in Edge Runtime)');
        passed = false;
    } else {
        console.log('PASS: Buffer object is undefined. (Expected in Edge Runtime)');
    }

    if (passed) {
        console.log('All Edge Runtime compatibility tests passed as expected.');
    } else {
        console.log('Some Edge Runtime compatibility tests failed, indicating a Node.js-like environment.');
    }
    return passed;
}

testEdgeRuntimeCompatibility();
