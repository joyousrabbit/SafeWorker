E.setTimeZone(2);
g.clear();
// Load widgets
Bangle.loadWidgets();
Bangle.drawWidgets();

const X = 210, Y = 140;

function clear_bkg(){
  g.setBgColor(0,0,0);
  g.clearRect(0,24,240,240);
}

function show_idle(){
  clear_bkg();
  g.setFont("6x8",6);
  g.setFontAlign(0,1); // align center bottom
  g.drawString("IDLE", g.getWidth()/2, Y, true /*clear background*/);
}

function show_rest(rest){
  clear_bkg();
  g.setFont("6x8",8);
  g.setFontAlign(0,1); // align center bottom
  g.drawString(rest, g.getWidth()/2, Y, true /*clear background*/);
}

function turn_off_acccelerometer(){
  Bangle.accelWr(0x18,0x0A); // accelerometer off
}

function turn_on_acccelerometer(){
  Bangle.accelWr(0x18,0b11101100); // accelerometer on
}

var HZ = 12.5;
var SAMPLES = Math.floor(5*HZ); // 5 seconds
var SCALE = 5000;
accelx = null;
accely = null;
accelz = null;
accelIdx = 0;
function record(){
  clear_bkg();
  g.setFont("6x8",4);
  g.setFontAlign(0,1); // align center bottom
  g.drawString("recording", g.getWidth()/2, Y, true /*clear background*/);
  accelx = new Int16Array(SAMPLES);
  accely = new Int16Array(SAMPLES); // North
  accelz = new Int16Array(SAMPLES); // Into clock face
  accelIdx = 0;
  turn_on_acccelerometer();
}

function recordStop(){
  turn_off_acccelerometer();
  Bangle.buzz();
  btdb.state = "recorded";
  behavior_tree("");
}

require("Font7x11Numeric7Seg").add(Graphics);
Bangle.on('accel', function(acc) {
  // acc = {x,y,z,diff,mag}
  if(accelIdx>=SAMPLES){
    return;
  }
  var i = accelIdx++;
  accelx[i] = acc.x*SCALE*2;
  accely[i] = acc.y*SCALE*2;
  accelz[i] = acc.z*SCALE*2;
  g.setFont("7x11Numeric7Seg",2);
  g.setFontAlign(0,1); // align center bottom
  g.drawString(accelx[i], g.getWidth()/2, Y+30, true /*clear background*/);
  if (accelIdx>=SAMPLES) recordStop();
});

function show_save(){
  clear_bkg();
  g.setFont("6x8",6);
  g.setFontAlign(0,1); // align center bottom
  g.drawString("SAVE?", g.getWidth()/2, Y, true /*clear background*/);
  g.setFont("6x8",3);
  g.drawString("Y", g.getWidth()/2+80, Y-80, true /*clear background*/);
  g.drawString("N", g.getWidth()/2+80, Y+80, true /*clear background*/);
}

function save(){
  var i = 0;
  while(true){
    var fn = "accelrec."+i+".csv";
    var exists = require("Storage").read(fn+"\1")!==undefined;
    if(exists==false){
        var file = require("Storage").open(fn,"w");
        for (var k=0;k<SAMPLES;k++){
          var csv = [
            accelx[k]/SCALE,
            accely[k]/SCALE,
            accelz[k]/SCALE
           ];
          // Write data here
          file.write(csv.join(",")+"\n");
        }
        break;
     }
    i++;
   }
}

//behavior tree
btdb = {state:"idle",rest:0};
function behavior_tree(trigger){
  if(btdb.state=="idle"&&trigger=="btn2"){
    btdb.state = "counting_down";
    btdb.rest = 3;
    behavior_tree();
  }else if(btdb.state=="counting_down"){
    if(trigger=="btn3"){
      btdb.state = "idle";
      behavior_tree("");
     }else if(btdb.rest>0){
       show_rest(btdb.rest);
       btdb.rest -= 1;
       setTimeout(function(){behavior_tree("");}, 1000);
     }else if(btdb.rest<=0){
       btdb.state = "record";
       behavior_tree("");
     }
  }else if(btdb.state=="idle"){
    show_idle();
  }else if(btdb.state=="record"){
    record();
  }else if(btdb.state=="recorded"){
    show_save();
    if(trigger=="btn1"){
      save();
      btdb.state="idle";
      behavior_tree("");
    }else if(trigger=="btn3"){
      btdb.state="idle";
      behavior_tree("");
    }
  }
}


//btn1
function btn1_short(){
  //console.log('btn1 short');
  behavior_tree("btn1");
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
  behavior_tree("btn2");
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
  behavior_tree("btn3");
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

turn_off_acccelerometer();
Bangle.setLCDTimeout(10);
behavior_tree("");