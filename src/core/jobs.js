"use strict";

var default_job_interval = 1; //at least two miliseconds between runs

function JobDestroyFunc(Joblet job);
function JobStartFunc(Joblet job);
function JobFinishFunc(Joblet job);

class ThreadIterator {  
  constructor(worker) {
    this.queue = [];
    this.worker = worker;
    this.iter = {value : undefined, done : false};
    this.data = undefined;
    
    var this2 = this;
    worker.onerror = function(event) {
      console.log("worker error; event: ", event);
      this2.iter.done = true;
    }
    
    var this2 = this;
    worker.onmessage = function(event) {
      var data = event.data.evaluated()
      
      console.log(data);
      
      if (data == "{{terminate}}") {
        this2.kill();
        return;
      }
      
      this2.queue.push(data);
    }
  }
  
  next() {
    if (this.iter.done && this.poll()) {
      this.data = this.get();
    }
    
    return this.iter;
  }
  
  send(msg) {
    this.worker.postMessage(data);
  }
  
  poll() {
    return this.queue.length;
  }
  
  get() {
    if (this.queue.length === 0) 
      return undefined;
      
    var msg = this.queue[0];
    this.queue.shift();
    
    return msg;
  }
  
  kill() {
    this.iter.done = true;
    this.worker.terminate();
  }
  
} ThreadIterator;

function worker_joblet(url, method, data) {
  var worker = new Worker(url);
  
  worker.postMessage({method : method, data : data});
  
  var iter = new ThreadIterator(worker);  
}

class Joblet {
  constructor(Object owner, Iterator iter, 
               JobDestroyFunc destroyer, int ival, 
               JobStartFunc start, JobFinishFunc finish)
  { //if ival is 0 or undefined, it use default_job_interval
    if (ival == 0 || ival == undefined) {
      ival = default_job_interval;
    }
    
    if (destroyer == undefined) {
      destroyer = function(job) { };
    }
    
    this.start = start; //function, start(job)
    this.finish = finish;
    this.ival = ival;
    this._kill = destroyer; //function, destroyer(job)
    this.dead = false;
    this.removed = false;
    this.type = get_type_name(iter);
    this.iter = iter;
    this.owner = owner;
    this.last_ms = time_ms(10);
    this.time_mean = new movavg();
    this._id = 0;
    this.queued = false;
  }

  kill() {
    this._kill(this);
  }
  
  start() {
    this.iter = new this.type;
  }
  __hash__() : String {
    return get_type_name(this) + this._id;
  }
}

function JobManager() {
  this.jobs = new GArray<Joblet>();
  this.jobmap_owners = new hashtable<Object,Joblet>();
  this.jobmap_types = new hashtable<String,Joblet>();
  this.queue = new GArray<Joblet>();
  this.idgen = 0;
  this.last_ms = time_ms();
  this.ival = default_job_interval;
  
  this.host_mean = new movavg(10);
  this.time_perc = 0.3;
}
create_prototype(JobManager);

JobManager.prototype.add_job = function(Joblet job) {
  var owner = job.owner;
  var type = job.type;
  
  job._id = this.idgen++;
  
  this.jobs.push(job);
  
  if (!this.jobmap_owners.has(owner))
    this.jobmap_owners.add(owner, new GArray<Joblet>());
  if (!this.jobmap_types.has(type))
    this.jobmap_types.add(type, new GArray<Joblet>());
  
  var type = job.type;
  
  this.jobmap_owners.get(owner).push(job);
  this.jobmap_types.get(type).push(job);
}

JobManager.prototype.remove_job = function(Joblet job) {
  var type = job.type;
  
  if (this.removed) {
    console.trace();
    throw "Tried to remove an already removed job!";
  }
  
  if (!this.dead)
    job.kill(job);
  
  if (job.queued) {
    this.queue.remove(job);
  }
  
  this.jobs.remove(job);
  this.jobmap_owners.get(job.owner).remove(job);
  this.jobmap_types.get(job.type).remove(job); 
  
  var q_job, q_i=1000000;
  
  for (var job2 in this.jobmap_types.get(type)) {
    if (job2.queued) {
      var i = this.queue.indexOf(job2);
      if (i < q_i) {
        q_job = job2;
        q_i = i;
      }
    }
  }
  
  if (q_job != undefined) {
    if (q_job.start != undefined)
      q_job.start(q_job);
    
    this.queue.remove(q_job);
    q_job.queued = false;
  }
}

JobManager.prototype.kill_owner_jobs = function(Object owner) {
  if (!this.jobmap_owners.has(owner))
    return;
    
  var jobs = g_list(this.jobmap_owners.get(owner));
  
  for (var job in jobs) {
    this.remove_job(job);
  }
  
  this.jobmap_owners.remove(owner);
}

JobManager.prototype.kill_type_jobs = function(Object type) {
  type = get_type_name(type);
  
  if (!jobmap_types.has(type))
    return;
    
  var jobs = g_list(jobmap_types.get(type));
  
  for (var job in jobs) {
    this.remove_job(job);
  }
  
  this.jobmap_types.remove(type);
}

JobManager.prototype.queue_job = function(job) {
  this.add_job(job);
  
  job.queued = true;
  this.queue.push(job);
}

JobManager.prototype.queue_replace = function(Joblet job, JobStartFunc start) { //replaces any queued job of the same type
  var type = job.type;
  
  if (start != undefined) {
    job.start = start;
  }
  
  if (this.jobmap_types.has(type)) {
    var lst = this.jobmap_types.get(type);
    var found_queued = false;
    
    for (var job2 in g_list(lst)) {
      if (job2.queued) {
        this.remove_job(job2);
        found_queued = true;
      }
    }
    
    if (this.jobmap_types.get(type).length > 0) {
      this.queue_job(job);
    } else {
      this.add_job(job);
      if (start != undefined)
        start();
    }
  } else {
    this.add_job(job);
    if (start != undefined)
      start();
  }
}

JobManager.prototype.run = function() {
  if (time_ms() - this.last_ms < this.ival)
    return;
  
  var host_ival = time_ms() - this.last_ms - this.ival;
  host_ival = this.host_mean.update(host_ival);
  
  var max_time = Math.abs((-host_ival*this.time_perc) / (1.0-this.time_perc));
  this.last_ms = time_ms();
  
  while (time_ms() - this.last_ms < max_time) {
    if (this.jobs.length == 0)
      break;
      
    for (var job in this.jobs) {
      if (job.queued) continue;
      
      var ms = time_ms();
      
      
      var reti = job.iter.next();
      if (!reti.done) {
        var d = time_ms() - job.last_ms 
        job.time_mean.update(d);
        
        job.last_ms = time_ms();
      } else {
        if (job.finish != undefined)
          job.finish(job);
        
        this.remove_job(job);
      }
    }
  }
  
  this.last_ms = time_ms();
}

JobManager.prototype.has_job = function(Object type) {
  type = get_type_name(type);
  if (this.jobmap_types.has(type)) {
    return this.jobmap_types.get(type).length > 0;
  }
  
  return false;
}
