var SerialPort = require('serialport');
var sleep = require('sleep');

var wbus_buffer        = new Buffer.alloc(30);
var wbus_pos = 0;
var wbus_length = 0;
var wbus_xor = 0;
var webasto_run = 0;

var webasto_data = {
        keepalife: 0
};
var webasto_data2 = {
        status_caf: 0,      // Combustion Fan
        status_fp:  0,      // Fuel Pump
        status_gp:  0,      // Glow Plug
        status_cp:  0,      // Circulation Pump
        status_vfr: 0,      // Vehicle Fan Relays
        status_nsh: 0,      // Nozzle stock heating
        status_fi:  0,      // Flame indicator
        status_ms:  0,      // Main switch
        status_shr: 0,      // Suplemental heater request
        status_os: -1,      // Operating state

        status_temp:   0,   // Temperature with  50 C offset (20 C is value=70)
        status_mvolt:  0,   // Voltage in mili Volt
        status_fd:     0,   // Flame detector (set 0x01, not set 0x00)
        status_hp:     0,   // Heating power in watts, big endian
        status_fdr:    0,   // Flame detector resistance in mili Ohm, big endian

        status_wh:     0,   // Working hours
        status_wm:     0,   // Working minutes
        status_oh:     0,   // Operating hours
        status_om:     0,   // Operating minutes
        status_sc:     0,   // Start counter

        status_gpp: 0,      // Glow plug power in percent *2
        status_fpf: 0,      // Fuel pump pulse frequency in Hz *2
        status_afp: 0,      // Combustion air fan in percent*2

        info_version: 0,    // Version 
        info_devname: 0,    // Device name
        info_wbuscode: 0,   // WBUS Code

        error_count:   0,   // Total number of errors
        error_buffer:  0,   // Buffer of errors
        check:      0       // check
}


function wbus_parse_state(state) {
  switch(parseInt(state)) {
    case 0x00 : return("0x00 Burn Out"); break;
    case 0x01 : return("0x01 Deactivation"); break;
    case 0x02 : return("0x02 Burn Out ADR"); break;
    case 0x03 : return("0x03 Burn Out Ramp"); break;
    case 0x04 : return("0x04 Off State"); break;
    case 0x05 : return("0x05 Combustion process part load"); break;
    case 0x06 : return("0x06 Combustion process full load"); break;
    case 0x07 : return("0x07 Fuel supply"); break;
    case 0x08 : return("0x08 Combustion air fan start"); break;
    case 0x09 : return("0x09 Fuel supply interruption"); break;
    case 0x0a : return("0x0a Diagnostic state"); break;
    case 0x0b : return("0x0b Fuel pump interruption"); break;
    case 0x0c : return("0x0c EMF measurement"); break;
    case 0x0d : return("0x0d Debounce"); break;
    case 0x0e : return("0x0e Deactivation"); break;
    case 0x0f : return("0x0f Flame detector interrogation"); break;
    case 0x10 : return("0x10 Flame detector cooling"); break;
    case 0x11 : return("0x11 Flame detector measuring phase"); break;
    case 0x12 : return("0x12 Flame detector measuring phase ZUE"); break;
    case 0x13 : return("0x13 Fan start up"); break;
    case 0x14 : return("0x14 Glow plug ramp"); break;
    case 0x15 : return("0x15 Heater interlock"); break;
    case 0x16 : return("0x16 Initialization"); break;
    case 0x17 : return("0x17 Fuel bubble compensation"); break;
    case 0x18 : return("0x18 Fan cold start-up"); break;
    case 0x19 : return("0x19 Cold start enrichment"); break;
    case 0x1a : return("0x1a Cooling"); break;
    case 0x1b : return("0x1b Load change PL-FL"); break;
    case 0x1c : return("0x1c Ventilation"); break;
    case 0x1d : return("0x1d Load change FL-PL"); break;
    case 0x1e : return("0x1e New initialization"); break;
    case 0x1f : return("0x1f Controlled operation"); break;
    case 0x20 : return("0x20 Control iddle period"); break;
    case 0x21 : return("0x21 Soft start"); break;
    case 0x22 : return("0x22 Savety time"); break;
    case 0x23 : return("0x23 Purge"); break;
    case 0x24 : return("0x24 Start"); break;
    case 0x25 : return("0x25 Stabilization"); break;
    case 0x26 : return("0x26 Start ramp"); break;
    case 0x27 : return("0x27 Out of power"); break;
    case 0x28 : return("0x28 Interlock"); break;
    case 0x29 : return("0x29 Interlock ADR (Australian design rules)"); break;
    case 0x2a : return("0x2a Stabilization time"); break;
    case 0x2b : return("0x2b Change to controlled operation"); break;
    case 0x2c : return("0x2c Decision state"); break;
    case 0x2d : return("0x2d Prestart fuel supply"); break;
    case 0x2e : return("0x2e Glowing"); break;
    case 0x2f : return("0x2f Glowing power control"); break;
    case 0x30 : return("0x30 Delay lowering"); break;
    case 0x31 : return("0x31 Sluggish fan start"); break;
    case 0x32 : return("0x32 Additional glowing"); break;
    case 0x33 : return("0x33 Ignition interruption"); break;
    case 0x34 : return("0x34 Ignition"); break;
    case 0x35 : return("0x35 Intermittent glowing"); break;
    case 0x36 : return("0x36 Application monitoring"); break;
    case 0x37 : return("0x37 Interlock save to memory"); break;
    case 0x38 : return("0x38 Heater interlock deactivation"); break;
    case 0x39 : return("0x39 Output control"); break;
    case 0x3a : return("0x3a Circulating pump control"); break;
    case 0x3b : return("0x3b Initialization uP"); break;
    case 0x3c : return("0x3c Stray light interrogation"); break;
    case 0x3d : return("0x3d Prestart"); break;
    case 0x3e : return("0x3e Pre-ignition"); break;
    case 0x3f : return("0x3f Flame ignition"); break;
    case 0x40 : return("0x40 Flame stabilization"); break;
    case 0x41 : return("0x41 Combustion process parking heating"); break;
    case 0x42 : return("0x42 Combustion process suppl. heating"); break;
    case 0x43 : return("0x43 Combustion failure failure heating"); break;
    case 0x44 : return("0x44 Combustion failure suppl. heating"); break;
    case 0x45 : return("0x45 Heater off after run"); break;
    case 0x46 : return("0x46 Control iddle after run"); break;
    case 0x47 : return("0x47 After-run due to failure"); break;
    case 0x48 : return("0x48 Time-controlled after-run due to failure"); break;
    case 0x49 : return("0x49 Interlock circulation pump"); break;
    case 0x4a : return("0x4a Control iddle after parking heating"); break;
    case 0x4b : return("0x4b Control iddle after suppl. heating"); break;
    case 0x4c : return("0x4c Control iddle period suppl. heating with circulation pump"); break;
    case 0x4d : return("0x4d Circulation pump without heating function"); break;
    case 0x4e : return("0x4e Waiting loop overvoltage"); break;
    case 0x4f : return("0x4f Fault memory update"); break;
    case 0x50 : return("0x50 Waiting loop"); break;
    case 0x51 : return("0x51 Component test"); break;
    case 0x52 : return("0x52 Boost"); break;
    case 0x53 : return("0x53 Cooling"); break;
    case 0x54 : return("0x54 Heater interlock permanent"); break;
    case 0x55 : return("0x55 Fan iddle"); break;
    case 0x56 : return("0x56 Break away"); break;
    case 0x57 : return("0x57 Temperature interrogation"); break;
    case 0x58 : return("0x58 Prestart undervoltage"); break;
    case 0x59 : return("0x59 Accident interrogation"); break;
    case 0x5a : return("0x5a After-run solenoid valve"); break;
    case 0x5b : return("0x5b Fault memory update solenoid valve"); break;
    case 0x5c : return("0x5c Timer-controlled after-run solenoid valve"); break;
    case 0x5d : return("0x5d Startup attempt"); break;
    case 0x5e : return("0x5e Prestart extension"); break;
    case 0x5f : return("0x5f Combustion process"); break;
    case 0x60 : return("0x60 Timer-controlled after-run due to undervoltage"); break;
    case 0x61 : return("0x61 Fault memory update prior switch off"); break;
    case 0x62 : return("0x62 Ramp full load"); break;
  }
}

//
// Parse WBUS Buffer
//
function wbus_parse() {
  var b = 0;
  var i = 0;

  var wbus_data;
  var wbus_length;

  var heater_response = false;

  // console.log(wbus_buffer);
  
  wbus_data = parseInt(('00' + wbus_buffer[0].toString(16)).substr(-2),16);
  wbus_length = parseInt((wbus_buffer[1].toString(16)).substr(-2),16);

//  console.log("wbus_data: " + wbus_data + " wbus_length: " + wbus_length);

//  var b;
//  for (b = 0; b < wbus_length; b++) {
//    console.log(b + ':' + ('00' + wbus_buffer[b].toString(16)).substr(-2));
//  }
//  console.log("wbus_buffer: " + wbus_buffer);
  switch (wbus_data) {
     case 0x34:
//        console.log('From: MultiControl  to:    Heater.');
        break;
     case 0x43:
//        console.log('From: Heater        to:    MultiControl.');
        break;
     case 0x4f:
//        console.log('From: Heater        to:    Raspberry PI.');
        heater_response = true;
        break;
     case 0xf4:
//        console.log('From: Raspberry PI  to:    Heater.');
        break;
  } 

  if (wbus_buffer[2] == 0xc4) {
      webasto_data.keepalife++;
//      console.log('KeepAlife');
  }
 
  if (heater_response && wbus_buffer[2] == 0xd0) {
    if (parseInt(('00' + wbus_buffer[3].toString(16)).substr(-2),16) == 2) {
      webasto_data.status_ms  = (wbus_buffer[4] & 0x01) ? 1 : 0;
      webasto_data.status_shr = (wbus_buffer[4] & 0x10) ? 1 : 0;
    }
    if (parseInt(('00' + wbus_buffer[3].toString(16)).substr(-2),16) == 3) {
      webasto_data.status_caf = (wbus_buffer[4] & 0x01) ? 1 : 0;
      webasto_data.status_gp  = (wbus_buffer[4] & 0x02) ? 1 : 0;
      webasto_data.status_fp  = (wbus_buffer[4] & 0x04) ? 1 : 0;
      webasto_data.status_cp  = (wbus_buffer[4] & 0x08) ? 1 : 0;
      webasto_data.status_vfr = (wbus_buffer[4] & 0x10) ? 1 : 0;
      webasto_data.status_nsh = (wbus_buffer[4] & 0x20) ? 1 : 0;
      webasto_data.status_fi  = (wbus_buffer[4] & 0x40) ? 1 : 0;
    }
    if (parseInt(('00' + wbus_buffer[3].toString(16)).substr(-2),16) == 5) {
      webasto_data.status_temp   = wbus_buffer[4] - 50;
      webasto_data.status_mvolt  = Math.floor(((parseInt(wbus_buffer[5])*256)+parseInt(wbus_buffer[6]))/10)/100;
      webasto_data.status_fd     = wbus_buffer[7];
      webasto_data.status_hp     = ((parseInt(wbus_buffer[8])*256)+parseInt(wbus_buffer[9]))/10;
      webasto_data.status_fdr    = ((parseInt(wbus_buffer[10])*256)+parseInt(wbus_buffer[11]))/10000;
    }
    if (parseInt((wbus_buffer[3].toString(16)).substr(-2),16) == 6) {
      webasto_data.status_wh   = ((parseInt(wbus_buffer[4])*256)+parseInt(wbus_buffer[5]));
      webasto_data.status_wm   = wbus_buffer[6];
      webasto_data.status_oh   = ((parseInt(wbus_buffer[7])*256)+parseInt(wbus_buffer[8]));
      webasto_data.status_om   = wbus_buffer[9];
      webasto_data.status_sc   = ((parseInt(wbus_buffer[10])*256)+parseInt(wbus_buffer[11]));
    }
    if (parseInt((wbus_buffer[3].toString(16)).substr(-2),16) == 7) {
      webasto_data.status_os  = wbus_parse_state(wbus_buffer[4]);
      //console.log(wbus_parse_state(wbus_buffer[4]));
    }
    if (parseInt((wbus_buffer[3].toString(16)).substr(-2),16) == 0x0f) {
      webasto_data.status_gpp  = ((parseInt(wbus_buffer[4]))*2);
      webasto_data.status_fpf  = ((parseInt(wbus_buffer[5]))*2);
      webasto_data.status_afp  = ((parseInt(wbus_buffer[6]))*2);
    }
  }
  if (heater_response && wbus_buffer[2] == 0xd1) {
    if (parseInt((wbus_buffer[3].toString(16)).substr(-2),16) == 0x0a) {    // W-BUS version. 1 byte, each nibble is one digit. 0x33 means version 3.3
      webasto_data.info_version  = ((wbus_buffer[4]>>4)+"."+(wbus_buffer[4]&0xf)) 
    }
    if (parseInt((wbus_buffer[3].toString(16)).substr(-2),16) == 0x0b) {    // Device Name: ASCII Text string.
      //webasto_data.info_devname  = Buffer.from(wbus_buffer, 2, wbus_length-2);
      webasto_data.info_devname  = "Webasto Air Top Evo 40";
    }
    if (parseInt((wbus_buffer[3].toString(16)).substr(-2),16) == 0x0c) {    // W-BUS code
      //webasto_data.info_wbuscode  = Buffer.from(wbus_buffer, 2, wbus_length-2);
      webasto_data.info_wbuscode  = "None";
    }
  }
//  console.log(webasto_data);
}

exports.error = function(error) {
  switch(parseInt(error)) {
    case 0x00 : return("0x00 No Error"); break;
  }
}


//
// Open WBUS Serial port
//
exports.open = function(wbus_port) {
  var wbus = new SerialPort(String(wbus_port), {
                baudrate: 2400,
                dataBits: 8,
                stopBits: 1,
                parity: 'even',
                parser: SerialPort.parsers.raw});



exports.write = function(data) {
  wbus.write(data);
}

//
// Return Webasto Data
//
exports.update = function() {
  switch(webasto_run) {
    case 0:
      wbus.write([0xf4, 0x03, 0x50, 0x02, 0xa5]);
      webasto_run++;
      break;
    case 1:
      wbus.write([0xf4, 0x03, 0x50, 0x03, 0xa4]);
      webasto_run++;
      break;
    case 2:
      wbus.write([0xf4, 0x03, 0x50, 0x07, 0xa0]);
      webasto_run++;
      break;
    case 3:
      wbus.write([0xf4, 0x03, 0x50, 0x05, 0xa2]);
      webasto_run++;
      break;
    case 4:
      wbus.write([0xf4, 0x03, 0x50, 0x0f, 0xa8]);
      webasto_run++;
      break;
    case 5:
      wbus.write([0xf4, 0x03, 0x50, 0x06, 0xa1]);
      webasto_run++;
      break;
    case 6:
      webasto_run=0;
      break;
  }
  return webasto_data;
}

//
// Parse WBUS Data
//
wbus.on('data', function(data) {

//  console.log('Data recieved');
 
  var b; 
  for (b = 0; b < data.length; b++) {
//    console.log(('00' + data[b].toString(16)).substr(-2));

  var wbus_data = parseInt(('00' + data[b].toString(16)).substr(-2),16);
 
    switch (wbus_data) {
     case 0x34:
        wbus_pos = 0;
        wbus_buffer[wbus_pos] = wbus_data;
	wbus_pos++;
        break;
      case 0x43:
        wbus_pos = 0;
        wbus_buffer[wbus_pos] = wbus_data;
	wbus_pos++;
        break;
      case 0x4f:
        wbus_pos = 0;
        wbus_buffer[wbus_pos] = wbus_data;
	wbus_pos++;
        break;
      case 0xf4:
        wbus_pos = 0;
        wbus_buffer[wbus_pos] = wbus_data;
	wbus_pos++;
        break;
      default:
        if (wbus_pos === 1) {
          wbus_length = wbus_data;
          wbus_buffer[wbus_pos] = wbus_data;
          wbus_pos++;
        } else {
          wbus_buffer[wbus_pos] = wbus_data;

          if (wbus_pos > wbus_length) {
            for (i = 0; i <= wbus_pos; i++) {
              if (i < wbus_pos) {
                wbus_xor = wbus_xor^wbus_buffer[i];
              } else {
                if (wbus_xor == wbus_buffer[wbus_pos]) {
//                    console.log("xor correct : " + wbus_xor);
                    wbus_parse();
                    wbus_xor = 0;
		    wbus_pos = 0;
                } else {
//                    console.log("xor failed : " + wbus_xor);
                    wbus_xor = 0;
		    wbus_pos = 0;
                }
              }
            }

          }
          wbus_pos++;
        }
    }
  }
});
}

exports.close = function() {
  wbus.close();
}

