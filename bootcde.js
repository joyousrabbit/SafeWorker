E.setTimeZone(2);
g.clear();
// Load widgets
Bangle.loadWidgets();
Bangle.drawWidgets();

function clear_bkg(){
  g.setBgColor(0,0,0);
  g.clearRect(0,24,240,240);
}

//clock
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
  g.setFont("6x8",4);
  //SNCF
  g.setColor(0.9,0.1,0.6);
  g.fillRect(g.getWidth()/2-60, Y+58, g.getWidth()/2+60, Y+90);
  g.setColor(1,1,1);
  g.drawString("SNCF", g.getWidth()/2, Y+90, false /*clear background*/);
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

//sos
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
}
function remove_sos(){
  clear_bkg();
  btdb.state="";
  behavior_tree("");
}

//protection
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


//behavior tree
btdb = {state:"idle",notification:[],protection:false};
function behavior_tree(trigger){
  if(btdb.state!="sos"&&trigger=="btn2_long"){
    if(btdb.protection==false){
        protection_enable();
      }else if(btdb.protection==true){
        protection_disable();
      }
  }else{
    stop_clock();
    if(trigger=="btn1_long"){
      sos();
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

Bangle.setLCDTimeout(5);
behavior_tree("");