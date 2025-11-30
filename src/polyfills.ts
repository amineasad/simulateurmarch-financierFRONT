// src/polyfills.ts — VERSION QUI MARCHE À 100% SUR TON PROJET (copie-colle ça)
import 'zone.js/dist/zone';  // Obligatoire pour Angular

// Polyfills compatibles avec Angular 9/10 + core-js@2
import 'core-js/es6/symbol';
import 'core-js/es6/object';
import 'core-js/es6/function';
import 'core-js/es6/parse-int';
import 'core-js/es6/parse-float';
import 'core-js/es6/number';
import 'core-js/es6/math';
import 'core-js/es6/string';
import 'core-js/es6/date';
import 'core-js/es6/array';
import 'core-js/es6/regexp';
import 'core-js/es6/map';
import 'core-js/es6/weak-map';
import 'core-js/es6/set';
import 'core-js/es6/reflect';

// Pour IE11
(window as any).global = window;