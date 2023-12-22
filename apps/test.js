const gba = require('../libs/build/Release/gba');

console.log(gba.hello());
console.log(gba.add(3, 5));
gba.callbackTry((msg) => {
  console.log(`C++ call: ${msg}. That's rox`);
});

const a = gba.factory('Hello world');
const b = gba.factory('from factory');

console.log(a.msg, b.msg);

const fn = gba.factoryFn();
console.log(fn());

const obj1 = new gba.MyObject(10);
const obj2 = new gba.MyObject(4);
console.log(obj1.plusOne());
// Prints: 11
console.log(obj2.plusOne());
// Prints5:
console.log(obj1.plusOne());
// Prints: 12
