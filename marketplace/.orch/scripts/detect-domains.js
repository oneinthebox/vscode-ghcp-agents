#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const projectRoot = process.argv[2] || '.';

function exists(file) {
  return fs.existsSync(path.join(projectRoot, file));
}

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(path.join(projectRoot, file), 'utf8')); }
  catch { return null; }
}

function readFile(file) {
  try { return fs.readFileSync(path.join(projectRoot, file), 'utf8'); }
  catch { return ''; }
}

const domains = [];
const details = {};

// Angular / Frontend
const pkg = readJSON('package.json');
if (pkg) {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (deps['@angular/core']) {
    const version = (deps['@angular/core'] || '').replace(/[\^~]/, '');
    domains.push('angular');
    details.angular = {
      version,
      nx: exists('nx.json'),
      standalone: exists('angular.json') || exists('nx.json'),
      ui: deps['primeng'] ? 'primeng' : deps['@angular/material'] ? 'material' : null,
      state: deps['@ngrx/signals'] ? 'ngrx-signals' : deps['@ngrx/store'] ? 'ngrx-store' : null,
      test: deps['jest'] ? 'jest' : deps['karma'] ? 'karma' : null,
      e2e: deps['@playwright/test'] ? 'playwright' : deps['cypress'] ? 'cypress' : null
    };
  }
  if (deps['react'] || deps['react-dom']) {
    domains.push('react');
    details.react = { version: (deps['react'] || '').replace(/[\^~]/, '') };
  }
  if (deps['vue']) {
    domains.push('vue');
    details.vue = { version: (deps['vue'] || '').replace(/[\^~]/, '') };
  }
  if (deps['next']) {
    domains.push('nextjs');
  }
}

// Java / Spring Boot
if (exists('pom.xml')) {
  domains.push('springboot');
  const pom = readFile('pom.xml');
  details.springboot = {
    build: 'maven',
    springBoot: pom.includes('spring-boot')
  };
} else if (exists('build.gradle') || exists('build.gradle.kts')) {
  const gradle = readFile('build.gradle') || readFile('build.gradle.kts');
  if (gradle.includes('spring')) {
    domains.push('springboot');
    details.springboot = { build: 'gradle' };
  } else {
    domains.push('java');
    details.java = { build: 'gradle' };
  }
}

// Python
if (exists('pyproject.toml') || exists('requirements.txt') || exists('setup.py')) {
  const reqs = readFile('requirements.txt') + readFile('pyproject.toml');
  if (reqs.includes('fastapi')) {
    domains.push('fastapi');
    details.fastapi = { build: exists('pyproject.toml') ? 'uv' : 'pip' };
  } else if (reqs.includes('django')) {
    domains.push('django');
  } else {
    domains.push('python');
  }
}

// Docker
if (exists('docker-compose.yml') || exists('docker-compose.yaml') || exists('Dockerfile')) {
  details.docker = true;
}

// Nx monorepo (may contain multiple apps with different domains)
if (exists('nx.json')) {
  details.monorepo = 'nx';
  // Scan apps/ for per-project package.json (future enhancement)
}

const result = {
  domains,
  primary: domains[0] || null,
  details,
  detected_at: new Date().toISOString()
};

process.stdout.write(JSON.stringify(result, null, 2) + '\n');
