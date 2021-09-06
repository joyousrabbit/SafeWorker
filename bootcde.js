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
const mean_x = -0.2053098886401209, mean_y = 0.023619460890335627, mean_z = 0.28260046992700266;
const std_x = 0.8873002285294816, std_y = 0.6182222631212975, std_z = 0.5292343705607759;
// 1.2. Input parameters to the AI model
ms = 250;
var HZ = Math.floor(1000/ms); // Watch frequency, for ms = 250 >> Hz = 4.
const seconds = 3; // x seconds of data
const n_steps = Math.floor(seconds*HZ); // Number of records for the model
const ai_interval = 2; // AI model called every X second(s)
const ai_call = Math.floor(ai_interval*HZ);
const acc_thres = 0.5; // CRV Not implemented yet, acceleration threshold
var ai_input = Array.apply(null);
//var std_data = Array.apply(null);
var lack_mov = Array.apply(null);
var lack_mov_temp = Array.apply(null);
var result = 0; // Prediction values
var fall_monitor = 0;
var lack_movement_control = true;
var lack_mov_time = 5; //5min of lack of movement
var notify = false;

function reset_model(){
  ai_input = Array.apply(null);
  //std_data = Array.apply(null);
  lack_mov = Array.apply(null);
  lack_mov_temp = Array.apply(null);
}

// 1.3. The model (CRV: Model v18)
var model=atob("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");
var tf = require("tensorflow").create(3072, model);
var prediction = {
  0: "ADL",
  1 : "FALL"
};

var arrayMaxIndex = function(array) {
  return array.indexOf(Math.max.apply(null,array));
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

/// CALL AI MODEL
Bangle.on("accel", function(acc) {
   // AI Model
    ai_input.push((acc.x - mean_x)/std_x);
    //input.push((acc.y - mean_y)/std_y);
    ai_input.push((acc.z - mean_z)/std_z);

    //Calling the model
    if (ai_input.length >= n_steps*2){
      tf.getInput().set(ai_input);
      tf.invoke();
      var solution = tf.getOutput();
      result = prediction[arrayMaxIndex(solution)];

      //Remove ai_call times the first element of the arrays
      for (var cl = 0; cl < ai_call; cl++){
        ai_input.shift();
        //input.shift();
        ai_input.shift();
      }

      if(result == "FALL"){
        //fall_monitor=Math.floor(HZ*3); // Monitor the fall for 3s
        ai_input = Array.apply(null);
        behavior_tree("ai_sos");
      }
  }//End of saving data for the model

  //Lack of movement detection
  if(lack_movement_control){
    //Save acc value 
    lack_mov_temp.push(acc.x);
    //Evaluate movement every 15s
    if(lack_mov_temp.length >= HZ*15) {
      //Calculate variation in movement
      mov = StarndardDeviation(lack_mov_temp);  
      lack_mov_temp = Array.apply(null);
      if(mov<0.1){//If variation is low then the lack of movement is True
        lack_mov.push(true);
      }else{//If variation is high then the lack of movement is False
        lack_mov.push(false);
      }
      //Evaluate if there are already the lack_mov_time min saved
      if(lack_mov.length>=lack_mov_time*4){
        if(lack_mov.filter(x => x).length == lack_mov.length){
          behavior_tree("ai_sos");
        }
        lack_mov.shift();
      }
    }
  }
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
  if(typeof clock_interval !== "undefined"){
    clock_interval = clearInterval(clock_interval);
  }
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
  reset_model();
  turn_on_acccelerometer();
}
function protection_disable(){
  delete_protection_icon();
  btdb.protection = false;
  turn_off_acccelerometer();
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

// 7. GPS
function draw_gps_icon(){
  g.reset();
  g.setFont("6x8",2);
  g.drawString("GPS",56,2);
}
function delete_gps_icon(){
  g.reset();
  g.setColor(0,0,0);
  g.fillRect(54, 0, 96, 24);
}
function gps_enable(){
  draw_gps_icon();
  //Bangle.setGPSPower(1);
}
function gps_disable(){
  delete_gps_icon();
  Bangle.setGPSPower(0);
}
function gps_timer(){
  if(btdb.gps_counting>0){
    gps_enable();
    btdb.gps_counting -= 1;
  }else if(btdb.state=="sos_counting_down" || btdb.state=="sos"){
    gps_enable();
  }else{
    gps_disable();
  }
}

// 8. behavior tree
btdb = {state:"init",notification:[],protection:false,sos_counting:0,gps_counting:10};
function behavior_tree(trigger){
  //print(btdb.state+" "+trigger);
  if(btdb.state=="init"){
    if(trigger==""){
      startup_screen();
      btdb.gps_counting = 10;
      btdb.state="idle";
      setTimeout(behavior_tree,5000,"");
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
          btdb.state="idle";
          behavior_tree("");
        }else if(btdb.sos_counting>0&&trigger=="counting_down"){
          show_sos_counting_down();
          btdb.sos_counting -= 1;
          setTimeout(behavior_tree,1000,"counting_down");
        }else if(btdb.sos_counting<=0&&trigger=="counting_down"){
          sos();
        }
      }else if(trigger=="btn1_long" || trigger=="ai_sos"){
        start_sos_counting_down(10);
        behavior_tree("counting_down");
      }else if(trigger=="ai_model"){
        start_sos_counting_down(60);
        behavior_tree("counting_down");
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

Bangle.setGPSPower(0);
Bangle.on('GPS',function(gps) {
  gps_recent = gps;
});
gps_enable();
setInterval(gps_timer, 5*1000);

turn_off_acccelerometer();
Bangle.setLCDTimeout(5);
behavior_tree("");