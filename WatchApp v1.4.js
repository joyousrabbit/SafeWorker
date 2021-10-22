E.setTimeZone(2);
g.clear();
// Load widgets
Bangle.loadWidgets();
Bangle.drawWidgets();
ms = 250;
Bangle.setPollInterval(ms);

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

var HZ = Math.floor(1000/ms); // Watch frequency, for ms = 250 >> Hz = 4.
const seconds = 3; // x seconds of data
const n_steps = Math.floor(seconds*HZ); // Number of records for the model
const ai_interval = 2; // AI model called every X second(s)
const ai_call = Math.floor(ai_interval*HZ);

var ai_input = Array.apply(null);
//var std_data = Array.apply(null);
var lack_mov = Array.apply(null);
var lack_mov_temp = Array.apply(null);
var result = 0; // Prediction values
var fall_monitor = 0;
var lack_movement_control = false;
var lack_mov_time = 5; //5min of lack of movement
var notify = false;
var mode = 0;
var e_id = new Date();

function reset_model(){
  ai_input = Array.apply(null);
  //std_data = Array.apply(null);
  lack_mov = Array.apply(null);
  lack_mov_temp = Array.apply(null);
}

// 1.3. The model (CRV: Model v10)
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
        mode = 21;
        //Bangle.buzz(1000);
        behavior_tree("ai_sos");
      }
  }//End of saving data for the model

  //Lack of movement detection
  if(lack_movement_control && !Bangle.isCharging()){
    //Save acc value
    lack_mov_temp.push(acc.x);
    //Evaluate movement every 15s
    if(lack_mov_temp.length >= HZ*15) {
      //Calculate variation in movement
      mov = StarndardDeviation(lack_mov_temp);
      lack_mov_temp = Array.apply(null);
      if(mov<0.01){//If variation is low then the lack of movement is True
        lack_mov.push(true);
      }else{//If variation is high then the lack of movement is False
        lack_mov.push(false);
      }
      //Evaluate if there are already the lack_mov_time min saved
      if(lack_mov.length>=lack_mov_time*4){
        if(lack_mov.filter(x => x).length == lack_mov.length){
          mode = 22;
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

function sos_sms(event_id, sos_mode){
  Bluetooth.println(JSON.stringify({
      t:"notify",
      id:event_id,
      src:1,
      sender:11,
      title:0,
      body:{
        DetectionTimeStamp:event_id,
        WatchID:11,
        EventID:event_id,
        Status:0,
        Transmitter:1,
        TransmitterID:11,
        SOStriggerMode:sos_mode,
        Location_time:gps_recent.time,
        Lat:gps_recent.lat,
        Lon:gps_recent.lon,
        Altitude:gps_recent.alt,
        OnSiteStatus:btdb.protection,
        Detection:0,
        Accx:0,
        Accy:0,
        Accz:0,
        HeartBeat:0,
      }}));
}

function sos(event_id, sos_mode){
  draw_sos();
  Bangle.buzz(1000);
  btdb.state = "sos";
  //d.toLocaleString('en-GB', { timeZone: 'France/Paris'});
  sos_sms(event_id, sos_mode);
}
function remove_sos(){
  mode = 0;
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

function send_notification(protection){
  t = 2;
  if(protection)t = 0;
  var n_id = new Date();
  Bluetooth.println(JSON.stringify({
    t:"notify",
    id:	n_id,
    src:1,
    sender:	11,
    title:2,
    body:
    {Message_type:t}
  }));
}

function protection_enable(){
  draw_protection_icon();
  btdb.protection = true;
  send_notification(btdb.protection);
  lack_movement_control = true;
  reset_model();
  turn_on_acccelerometer();
}

function protection_disable(){
  delete_protection_icon();
  btdb.protection = false;
  lack_movement_control = false;
  send_notification(btdb.protection);
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
  Bangle.setGPSPower(1);
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

    if(btdb.state=="sos"){
      sos_sms(e_id, mode);
    }




  }else{
    gps_disable();
  }
}

// 8. show call
function show_msg(txt){
  g.reset();
  g.setBgColor(0,0,1);
  g.clearRect(0,24,240,240);
  g.setFont("Vector",60);
  g.setFontAlign(0,0);
  g.drawString(txt,120,120,true);
  g.reset();
  Bangle.setLCDPower(1);
}

function turn_off_call(){
  btdb.calling = false;
  behavior_tree("");
}

// 9. behavior tree
btdb = {state:"init",notification:[],calling:false,protection:false,sos_counting:0,gps_counting:1};
function behavior_tree(trigger){
  console.log(trigger);
  console.log(btdb.notification.length);
  //print(btdb.state+" "+trigger);
  if(trigger=="call"){
    stop_clock();
    show_msg("Call In");
    btdb.calling = true;
    Bangle.buzz(1000);
    setTimeout(turn_off_call,10000);
  }else if(btdb.state=="init"){
    if(trigger==""){
      startup_screen();
      btdb.gps_counting = 1;
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
          reset_model();
          btdb.state="idle";
          behavior_tree("");
        }else if(btdb.sos_counting>0&&trigger=="counting_down"){
          Bangle.setLCDPower(true);
          show_sos_counting_down();
          btdb.sos_counting -= 1;
          setTimeout(behavior_tree,1000,"counting_down");
        }else if(btdb.sos_counting<=0&&trigger=="counting_down"){
          e_id = new Date();
          sos(e_id, mode);
        }
      }else if(btdb.state=="sos"){
            if(trigger=="btn5"){
              reset_model();
              remove_sos();
            }
      }else if(btdb.state != "sos"){
          if(trigger=="btn1_long"){
            mode = 1;
            start_sos_counting_down(10);
            behavior_tree("counting_down");
          }else if(trigger=="ai_sos"){
            reset_model();
            Bangle.buzz(1000);
            start_sos_counting_down(60);
            behavior_tree("counting_down");
          }else if(trigger=="btn_short"){
            startup_screen();
            setTimeout(behavior_tree,3000,"");
          }else if(btdb.notification.length>0){
            btdb.calling = true;
            Bangle.setLCDPower(true);
            show_msg(btdb.notification.shift());
            if(trigger=="notify"){
              Bangle.buzz(1000);
            }
            setTimeout(turn_off_call,10000);
          }else if(Bangle.isLCDOn() && btdb.state!="msg"){
            if(false){
            }else if(btdb.calling==false){
              start_clock();
              btdb.state="idle";
            }
          }
      }
    }
}

//btn1
function btn1_short(){
  behavior_tree('btn_short');
  //console.log('btn1 short');
}
function btn1_long(){
  console.log('btn1 long');
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
  behavior_tree('btn_short'); 
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
  behavior_tree('btn_short'); 
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
    case "call":
      if(event.cmd=="incoming"){
        behavior_tree("call");
      }
      break;
    case "notify":
        var title = event.title;
        var msg_body = event.body;
        btdb.notification.push(title);
        behavior_tree("notify");
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
setInterval(gps_timer, 30*1000);

turn_off_acccelerometer();
Bangle.setLCDTimeout(10);
behavior_tree("");