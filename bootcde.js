E.setTimeZone(2);
g.clear();
// Load widgets
Bangle.loadWidgets();
Bangle.drawWidgets();

function clear_bkg(){
  g.setBgColor(0,0,0);
  g.clearRect(0,24,240,240);
}

//gps
gps_recent = NaN;

// 1. AI model definition
// 1.1. Standarisation values
const mean_x = -0.1535140885519892, mean_y = -0.010161230784802246, mean_z = 0.2872841254429825;
const std_x = 0.8197504207078723, std_y = 0.6164881629530853, std_z = 0.557908881549523;
// 1.2. Input parameters to the AI model
var monitoring_control = -1;

var i = 0;
const n_steps = 12; // Number of records for the model
const ratio = 2; // indicates that the model keeps steps at 1/ratio the frequency
const ai_interval = 1; // AI model called every second
const ai_call = Math.floor(ai_interval*n_steps);
const acc_thres = 0.5; // CRV Not implemented yet, acceleration threshold
var HZ = 12.5; // Watch frequency
var SCALE = 5000;
var input = new Array(n_steps*3);
var accelx = Array.apply(null);
var accely = Array.apply(null);
var accelz = Array.apply(null);
var result = 0; // Prediction values
var fall_monitor = 0;

// 1.3. The model
var model=atob("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");


var tf = require("tensorflow").create(3072, model);

var prediction = {
  0: "ADL",
  1 : "FALL"
};

function StarndardDeviation(array)
{
  const n = array.length;
  const mean = array.reduce((a,b) => a+b)/n;
  return Math.sqrt(array.map(x=>Math.pow(x-mean,2)).reduce((a,b)=>a+b)/n);
}

// 1.4. Turn on accelerometer
function turn_on_acccelerometer(){
 //print("Accelerometer on");
 Bangle.accelWr(0x18,0b11101100); // accelerometer on
}

function turn_off_acccelerometer(){
  //print("Accelerometer off");
  Bangle.accelWr(0x18,0x0A); // accelerometer off
}

var arrayMaxIndex = function(array) {
  return array.indexOf(Math.max.apply(null,array));
};

/// CALL AI MODEL
//monitoring_control = -1  # Not execution of the ai model
//monitoring_control = 0  # Ai model initialised
//monitoring_control = 1  # Ai model running

Bangle.on("accel", function(acc) {
  if(monitoring_control>-1)//CRV Change to -1
  {
    if(monitoring_control==0)
    {
    i = monitoring_control;
    monitoring_control = 1; // Ai model running
    }
    i++; // Index starts in 1
    if(i%ratio == 0)
    {
    accelx.push((acc.x - mean_x)/std_x); // CRV Change the scale from here or move the standardisation
    accely.push((acc.y - mean_y)/std_y);
    accelz.push((acc.z - mean_z)/std_z);
    }

    //Calling the model
    if (i % ai_call == 0 && accelx.length >= n_steps && btdb.state!="sos_counting_down" && btdb.state!="sos" && result != "FALL")
    {
      i = 0;

      //Create input array
      for (var ns = 0; ns < n_steps; ns++)
      {
        input[ns*3] = accelx[ns];
        input[ns*3+1] = accely[ns];
        input[ns*3+2] = accelz[ns];
      }

      //print("\n");
      //print("INPUT TO MODEL");
      //print("\n");
      //print(input);
      tf.getInput().set(input);
      //print(tf.getInput());
      tf.invoke();
      var solution = tf.getOutput();
      result = prediction[arrayMaxIndex(solution)];

      //print("PREDICTION:");
      //print("\n");
      //print(result);
      //print("\n");
      if(result == "FALL")fall_monitor=Math.floor(HZ*3); // Monitor the fall for 3s
      //Remove ai_call times the first element of the arrays
      for (var cl = 0; cl < Math.floor(ai_call/ratio); cl++)
      {
      accelx.shift();
      accely.shift();
      accelz.shift();
      }
      //print('Cleaning ai_call amount of values');
      //print(accelx);

    }//End of calling the model

    if(fall_monitor>0) 
    {
      fall_monitor-=1;
      if(fall_monitor<=HZ*2 && fall_monitor>1)
      {
        std = StarndardDeviation(accelx);      
        if(std<0.1)
        {
          //print(std);
          fall_monitor = 0;
          behavior_tree("ai_model");
        }
      }
      if(fall_monitor<=1)result=0;
      if(accelx.length > n_steps)
      {
      accelx.shift();
      accely.shift();
      accelz.shift();
      }
    } //CRV Comment out this part
  }//End of saving data for the model
});

/// END CALL AI MODEL




// 2. Clock
require("Font7x11Numeric7Seg").add(Graphics);
function draw_clock(){
  const X = 210, Y = 140;
  var d = new Date();
  var h = d.getHours(), m = d.getMinutes();
  var time = (" 0"+h).substr(-2) + ":" + ("0"+m).substr(-2);
  // Reset the state of the graphics library
  g.reset();
  // draw the current time (4x size 7 segment)
  g.setFont("7x11Numeric7Seg",6);
  g.setFontAlign(1,1); // align right bottom
  g.drawString(time, X, Y, true /*clear background*/);
  // draw the seconds (2x size 7 segment)
  g.setFont("7x11Numeric7Seg",2);
  g.drawString(("0"+d.getSeconds()).substr(-2), X+30, Y, true /*clear background*/);
  // draw the date, in a normal font
  g.setFont("6x8",2);
  g.setFontAlign(0,1); // align center bottom
  // pad the date - this clears the background if the date were to change length
  var dateStr = "    "+require("locale").date(d)+"    ";
  g.drawString(dateStr, g.getWidth()/2, Y+30, true /*clear background*/);
  //SNCF
  //g.setColor(0.9,0.1,0.6);
  //g.fillRect(g.getWidth()/2-60, Y+58, g.getWidth()/2+60, Y+90);
  //g.setColor(1,1,1);
  //g.setFont("Vector",32);
  //g.drawString("SNCF", g.getWidth()/2, Y+93, false /*clear background*/);
}

clock_interval = null;
function start_clock(){
  clear_bkg();
  draw_clock();
  clock_interval = setInterval(draw_clock, 1000);
}
function stop_clock(){
  clearInterval(clock_interval);
}

// 3. startup_screen
function startup_screen(){
  g.reset();
  g.setBgColor(0,0,0);
  g.clearRect(0,24,240,240);
  g.setFont("Vector",30);
  g.setFontAlign(-1,-1);
  g.drawString("Maintenir",10,44,true);
  g.drawString("Appuye",10,84,true);
  g.drawString("Pour",10,124,true);
  g.drawString("Activer",10,164,true);
  var img_protection = require("heatshrink").decompress(atob("jEYwkBEDnu9wKKBhAKDBgv+BQoAB94LxhwLH8ALT9vd7wLH7oABC4Z2CBIQLCQQgfBAAXeBYgkBCwgiDDAoWFDAoWGX5hWDCw4MCBRIATA=="));
  g.drawImage(img_protection,198,110);
  var img_sos = require("heatshrink").decompress(atob("mEwwhC/AH4As5gAOCw0MC5/AC8HN7oABAYPc7nN5oXRAA3cC5YWJAAIvjC65IKC5oxBRIKNBAQIVCX8XEn/zngEDpgEFC5FP///+YED+nMn4EDC5E/+lD/9NCAIZB7n/mgEBC5fEmdC/9M4n/ln/nnEkRHLmnM4YnB5gVBI4IJBC5PCKoM0C4oFBAYKnKQwP/C4vMNAKBBC5EzpgxBL4kkBIIfCO5M0C4NEJQIrBAgJJCO5bOB5kvLQPyEIPzBITvJmfzQwLqE4QEBlh3KABoX/C/4X/C70FC60AqoAOCwwA/AH4AkA="));
  g.drawImage(img_sos,185,30);
  var img_poweron = require("heatshrink").decompress(atob("mUywg/8/4ADCyMPC4gAB+AXWDJ4XJDJoXLDJgXMQJQwHEA4yICooeBBAISBGRYwEAwYYDDIgyGBQoeCBIQHEGQ5IGMYpMFJJHwE4o7EB4gYHOYwFIDAgwIDAwMEDAzJGDAwREJJYGLJYQYCJIwYICQYYTBwbpFDCRkCCBIHMDH4YwAA4Y6cA4AGcAz/DDCPwDApLNCQoFDMhxdEDAJpEJZY/EC4R9QPYxLRJI4YEPxQwEDAgTEMpAiFC4gJEB4IZFA4wYFBQxCGDwoyJEgwLMIpAJLExSwKABDfLGBYZNC5YZLC5oZJC56oPAGY="));
  g.drawImage(img_poweron,185,180);
  g.reset();
}

// 4. sos
function draw_sos(){
  g.reset();
  g.setBgColor(1,0,0);
  g.clearRect(0,24,240,240);
  g.setFont("Vector",60);
  g.setFontAlign(0,0);
  g.drawString("SOS",120,120,true);
  g.drawString("x",200,200,true);
  g.reset();
}
function sos(){
  draw_sos();
  Bangle.buzz();
  btdb.state = "sos";
  Bluetooth.println(JSON.stringify({t:"info", msg:"SOS", gps:gps_recent}));
}
function remove_sos(){
  clear_bkg();
  btdb.state="";
  behavior_tree("");
  monitoring_control = 0;
}

// 5. protection (on-site bit)
function draw_protection_icon(){
  g.reset();
  var img = require("heatshrink").decompress(atob("jEYwkBEDnu9wKKBhAKDBgv+BQoAB94LxhwLH8ALT9vd7wLH7oABC4Z2CBIQLCQQgfBAAXeBYgkBCwgiDDAoWFDAoWGX5hWDCw4MCBRIATA=="));
  g.drawImage(img,28,0);
}
function delete_protection_icon(){
  g.reset();
  g.setColor(0,0,0);
  g.fillRect(28, 0, 52, 24);
}
function protection_enable(){
  draw_protection_icon();
  btdb.protection = true;
}
function protection_disable(){
  delete_protection_icon();
  btdb.protection = false;
}

// 6. sos_counting_down
function start_sos_counting_down(count_value){
  btdb.state="sos_counting_down";
  btdb.sos_counting = count_value;
}

function show_sos_counting_down(){
  //print(btdb.sos_counting);
  g.reset();
  g.setBgColor(1,0,0);
  g.clearRect(0,24,240,240);
  g.setFont("Vector",60);
  g.setFontAlign(0,0);
  g.drawString("SOS",100,56,true);
  g.drawString(btdb.sos_counting.toString(),120,120,true);
  g.drawString("x",200,200,true);
  g.reset();
}


// 7. behavior tree
btdb = {state:"init",notification:[],protection:false,sos_counting:0};
function behavior_tree(trigger){
  if(btdb.state=="init"){
    if(trigger==""){
      startup_screen();
      btdb.state="idle";
      monitoring_control = 0;
      setTimeout(behavior_tree,5000,"");
      setTimeout(turn_on_acccelerometer,6000);
    }
   }else if(btdb.state!="sos"&&trigger=="btn2_long"){
    if(btdb.protection==false){
        protection_enable();
      }else if(btdb.protection==true){
        protection_disable();
      }
   }else{
      stop_clock();
      if(btdb.state=="sos_counting_down"){
        if(trigger=="btn5"){
          monitoring_control = 0;
          btdb.state="idle";
          behavior_tree("");
        }else if(btdb.sos_counting>0&&trigger==""){
          show_sos_counting_down();
          btdb.sos_counting -= 1;
          setTimeout(behavior_tree,1000,"");
        }else if(btdb.sos_counting<=0&&trigger==""){
          sos();
        }
      }else if(trigger=="btn1_long"){
        start_sos_counting_down(10);
        behavior_tree("");
      }else if(trigger=="ai_model"){
        monitoring_control = -1;
        start_sos_counting_down(60);
        behavior_tree("");
      }else if(btdb.state=="sos"){
        if(trigger=="btn5"){
          remove_sos();
        }
      }else if(Bangle.isLCDOn()){
        if(false){
        }else{
          start_clock();
          btdb.state="idle";
        }
      }
    }
}



//btn1
function btn1_short(){
  //console.log('btn1 short');
}
function btn1_long(){
  //console.log('btn1 long');
  behavior_tree('btn1_long');
}
btn1_start_time = null;
btn1_timer = null;
btn1_long_trigger = false;
function btn1_timer_fn() {
  var d = new Date();
  var n = d.getTime()/1000;
  var time_diff = n-btn1_start_time;
  if(!BTN1.read()){
    clearInterval(btn1_timer);
   }
  if(time_diff>=2){
    btn1_long_trigger = true;
    clearInterval(btn1_timer);
    btn1_long();
   }
}
function btn1_start_interval(){
  var d = new Date();
  var n = d.getTime()/1000;
  btn1_start_time = n;
  btn1_timer = setInterval(btn1_timer_fn, 1000);
}
setWatch(function(e) {
  btn1_start_interval();
}, BTN1, { repeat:true, edge:'rising' });
setWatch(function(e) {
  clearInterval(btn1_timer);
  if(btn1_long_trigger){
    btn1_long_trigger = false;
   }else{
     btn1_short();
   }
}, BTN1, { repeat:true, edge:'falling' });

//btn2
function btn2_short(){
  //console.log('btn2 short');
}
function btn2_long(){
  //console.log('btn2 long');
  behavior_tree("btn2_long");
}
btn2_start_time = null;
btn2_timer = null;
btn2_long_trigger = false;
function btn2_timer_fn() {
  var d = new Date();
  var n = d.getTime()/1000;
  var time_diff = n-btn2_start_time;
  if(time_diff>=2){
    btn2_long_trigger = true;
    clearInterval(btn2_timer);
    btn2_long();
   }
}
setWatch(function(e) {
  btn2_start_time = e.time;
  btn2_timer = setInterval(btn2_timer_fn, 1000);
}, BTN2, { repeat:true, edge:'rising' });
setWatch(function(e) {
  clearInterval(btn2_timer);
  if(btn2_long_trigger){
    btn2_long_trigger = false;
   }else{
     btn2_short();
   }
}, BTN2, { repeat:true, edge:'falling' });

//btn3
function btn3_short(){
  //console.log('btn3 short');
}
setWatch(btn3_short, BTN3, { repeat:true, edge:'falling' });

//btn4
function btn4_short(){
  //console.log('btn4 short');
}
function btn4_long(){
  //console.log('btn4 long');
}
btn4_start_time = null;
btn4_timer = null;
btn4_long_trigger = false;
function btn4_timer_fn() {
  var d = new Date();
  var n = d.getTime()/1000;
  var time_diff = n-btn4_start_time;
  if(time_diff>=2){
    btn4_long_trigger = true;
    clearInterval(btn4_timer);
    btn4_long();
   }
}
setWatch(function(e) {
  btn4_start_time = e.time;
  btn4_timer = setInterval(btn4_timer_fn, 1000);
}, BTN4, { repeat:true, edge:'rising' });
setWatch(function(e) {
  clearInterval(btn4_timer);
  if(btn4_long_trigger){
    btn4_long_trigger = false;
   }else{
     btn4_short();
   }
}, BTN4, { repeat:true, edge:'falling' });

//btn5
function btn5_short(){
  //console.log('btn5 short');
  behavior_tree('btn5');
}
function btn5_long(){
  //console.log('btn5 long');
}
btn5_start_time = null;
btn5_timer = null;
btn5_long_trigger = false;
function btn5_timer_fn() {
  var d = new Date();
  var n = d.getTime()/1000;
  var time_diff = n-btn5_start_time;
  if(time_diff>=2){
    btn5_long_trigger = true;
    clearInterval(btn5_timer);
    btn5_long();
   }
}

setWatch(function(e) {
  btn5_start_time = e.time;
  btn5_timer = setInterval(btn5_timer_fn, 1000);
}, BTN5, { repeat:true, edge:'rising' });
setWatch(function(e) {
  clearInterval(btn5_timer);
  if(btn5_long_trigger){
   btn5_long_trigger = false;
   }else{
     btn5_short();
   }
}, BTN5, { repeat:true, edge:'falling' });

function lcd_on(){
  //console.log('lcd on');
  if(BTN1.read()){
    btn1_start_interval();
   }
  behavior_tree('lcdon');
}
function lcd_off(){
  //console.log('lcd off');
  behavior_tree('lcdoff');
}

Bangle.on('lcdPower',on=>{
  if (on) {
    lcd_on();
  }else{
    lcd_off();
  }
});

const _GB = global.GB;
global.GB = (event) => {
  switch(event.t) {
    case "find": //GB({"t":"find",n:false})
      var n = event.n;
      Bangle.buzz();
      behavior_tree("btn5");
      break;
    default:
      if (_GB) {
        setTimeout(_GB, 0, event);
      }
   }
};

Bangle.setGPSPower(1);
Bangle.on('GPS',function(gps) {
  gps_recent = gps;
});

turn_off_acccelerometer();
Bangle.setLCDTimeout(5);
behavior_tree("");