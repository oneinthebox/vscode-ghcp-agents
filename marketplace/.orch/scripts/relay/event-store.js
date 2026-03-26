'use strict';
const fs = require('fs');
const path = require('path');

const EVENTS_BASE = '.orch/workflow-state/events';
const ACTIVE_RUN_FILE = '.orch/workflow-state/active-run.json';

module.exports = {
  /**
   * Create the run directory for storing event files.
   * @param {string} runId - Unique run identifier
   * @param {string} projectRoot - Project root path
   * @returns {string} Absolute path to the created run directory
   */
  createRunDir(runId, projectRoot = '.') {
    const dir = path.join(projectRoot, EVENTS_BASE, runId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  },

  /**
   * Read a single event JSON file by event ID.
   * @param {string} runDir - Path to the run directory
   * @param {string} eventId - Event identifier (e.g. "001")
   * @returns {object|null} Parsed event object or null if not found
   */
  readEvent(runDir, eventId) {
    const file = path.join(runDir, `${eventId}.event.json`);
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw new Error(`Failed to read event ${eventId}: ${err.message}`);
    }
  },

  /**
   * Write an event JSON file atomically (write to .tmp, then rename).
   * @param {string} runDir - Path to the run directory
   * @param {object} event - The event object to persist
   */
  writeEvent(runDir, event) {
    if (!event || !event.identity || !event.identity.event_id) {
      throw new Error('Cannot write event: missing identity.event_id');
    }
    const file = path.join(runDir, `${event.identity.event_id}.event.json`);
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(event, null, 2));
    fs.renameSync(tmp, file);
  },

  /**
   * Read all event files in a run directory, sorted by filename.
   * @param {string} runDir - Path to the run directory
   * @returns {object[]} Array of parsed event objects
   */
  readAllEvents(runDir) {
    try {
      return fs.readdirSync(runDir)
        .filter(f => f.endsWith('.event.json'))
        .sort()
        .map(f => {
          try {
            return JSON.parse(fs.readFileSync(path.join(runDir, f), 'utf8'));
          } catch (err) {
            process.stderr.write(`Warning: failed to parse ${f}: ${err.message}\n`);
            return null;
          }
        })
        .filter(Boolean);
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw new Error(`Failed to read events from ${runDir}: ${err.message}`);
    }
  },

  /**
   * Read the manifest.json for a run.
   * @param {string} runDir - Path to the run directory
   * @returns {object|null} Parsed manifest or null if not found
   */
  readManifest(runDir) {
    const file = path.join(runDir, 'manifest.json');
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw new Error(`Failed to read manifest: ${err.message}`);
    }
  },

  /**
   * Write the manifest.json atomically.
   * @param {string} runDir - Path to the run directory
   * @param {object} manifest - Manifest data to write
   */
  writeManifest(runDir, manifest) {
    const file = path.join(runDir, 'manifest.json');
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2));
    fs.renameSync(tmp, file);
  },

  /**
   * Read the active-run.json file to determine if a workflow is in progress.
   * @param {string} projectRoot - Project root path
   * @returns {object|null} Active run data or null
   */
  readActiveRun(projectRoot = '.') {
    const file = path.join(projectRoot, ACTIVE_RUN_FILE);
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw new Error(`Failed to read active run: ${err.message}`);
    }
  },

  /**
   * Write active-run.json to mark a workflow as in-progress.
   * @param {string} runId - Run identifier
   * @param {string} workflowName - Name of the workflow
   * @param {string} projectRoot - Project root path
   */
  writeActiveRun(runId, workflowName, projectRoot = '.') {
    const file = path.join(projectRoot, ACTIVE_RUN_FILE);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const data = {
      run_id: runId,
      workflow_name: workflowName,
      started_at: new Date().toISOString()
    };
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  },

  /**
   * Remove the active-run.json file (workflow finished or cancelled).
   * @param {string} projectRoot - Project root path
   */
  clearActiveRun(projectRoot = '.') {
    const file = path.join(projectRoot, ACTIVE_RUN_FILE);
    try {
      fs.unlinkSync(file);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw new Error(`Failed to clear active run: ${err.message}`);
      }
    }
  },

  /**
   * Update the lifecycle status of an event and append to its status history.
   * @param {object} event - The event object to update (mutated in place)
   * @param {string} newStatus - New status value
   * @returns {object} The updated event
   */
  updateStatus(event, newStatus) {
    if (!event || !event.lifecycle) {
      throw new Error('Cannot update status: invalid event object');
    }
    event.lifecycle.status = newStatus;
    event.lifecycle.status_history.push({
      status: newStatus,
      at: new Date().toISOString()
    });
    if (newStatus === 'ready') event.lifecycle.ready_at = new Date().toISOString();
    if (newStatus === 'running') event.lifecycle.started_at = new Date().toISOString();
    if (newStatus === 'complete') event.lifecycle.completed_at = new Date().toISOString();
    return event;
  },

  /**
   * Check for a completion marker file written by an AI phase.
   * @param {string} runDir - Path to the run directory
   * @param {string} eventId - Event identifier
   * @returns {object|null} Parsed completion data or null
   */
  checkCompletionMarker(runDir, eventId) {
    const file = path.join(runDir, `${eventId}.complete.json`);
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw new Error(`Failed to read completion marker for ${eventId}: ${err.message}`);
    }
  }
};
