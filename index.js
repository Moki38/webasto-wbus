var serialport = require('serialport');
var sleep = require('sleep');

try {
    var config = require('./config');
} catch (err) {
    console.log("Missing or corrupted config file.");
    console.log("Have a look at config.js.example if you need an example.");
    console.log("Error: "+err);
    process.exit(-1);
}

var webasto_active = 0;
var webasto_active_retry = 0;

var wbus_pos = 0;
var wbus_buffer        = new Buffer(30);
var wbus_length = 0;
var wbus_xor = 0;

var webasto_data = {
        status_caf: 0,
        status_gp: 0,
        status_fp: 0,
        status_cp: 0,
        status_vfr: 0,
        status_nsh: 0,
        status_fi: 0,
        status_ms: 0,
        status_shr: 0,
        status_os: -1,

        status_temp: 0,
        status_mvolt1: 0,
        status_mvolt2: 0,
        status_fd: 0,
        status_hp1: 0,
        status_hp2: 0,
        status_fdr1: 0,
        status_fdr2: 0,

        status_gpp: 0,
        status_fpf: 0,
        status_afp: 0,

        sensor_temp: 0, // Temperature with 50?C offset (20?C is represented by 70)
        sensor_volt: 0, // 2 bytes Spannung in mili Volt, big endian
        sensor_fd: 0,   // 1 byte Flame detector flag
        sensor_he: 0,   // 2 byte, heating power, in percent or watts (semantic seems wrong, heating energy?)
        sensor_gpr: 0   // 2 byte, glow plug resistance in mili Ohm.
}

var webasto_init_0     = Buffer.from([0xf4, 0x02, 0x38, 0xce]);          // Diagnostic
var webato_get_stat_3  = Buffer.from([0xf4, 0x03, 0x50, 0x07, 0xa0]);
var webato_turn_on    = Buffer.from([0x34, 0x05, 0x2a, 0x21, 0xff, 0x4a, 0x8f]);
var webato_turn_off   = Buffer.from([0x34, 0x05, 0x2a, 0x21, 0xff, 0x47, 0x82]);

var wbus = new serialport(String(config.wbus.device), {
                baudrate: 2400,
                dataBits: 8,
                stopBits: 1,
                parity: 'even',
                parser: serialport.parsers.raw});


exports.state = function(state) {
  switch(parseInt(state)) {
    case -1 : return(""); break;
    case  0 : return("0x00 Burn Out"); break;
    case  1 : return("0x01 Deactivation"); break;
    case  2 : ("0x02 Burn Out ADR"); break;
    case  3 : return("0x03 Burn Out Ramp"); break;
    case  4 : return("0x04 Off State"); break;
    case  5 : return("0x05 Combustion process part load"); break;
    case  6 : return("0x06 Combustion process full load"); break;
    case  7 : return("0x07 Fuel supply"); break;
    case  8 : return("0x08 Combustion air fan start"); break;
    case  9 : return("0x09 Fuel supply interruption"); break;
    case 10 : return("0x0a Diagnostic state"); break;
    case 11 : return("0x0b Fuel pump interruption"); break;
    case 12 : return("0x0c EMF measurement"); break;
    case 13 : return("0x0d Debounce"); break;
    case 14 : return("0x0e Deactivation"); break;
    case 15 : return("0x0f Flame detector interrogation"); break;
    case 16 : return("0x10 Flame detector cooling"); break;
    case 17 : return("0x11 Flame detector measuring phase"); break;
    case 18 : return("0x12 Flame detector measuring phase ZUE"); break;
    case 19 : return("0x13 Fan start up"); break;
    case 20 : return("0x14 Glow plug ramp"); break;
    case 21 : return("0x15 Heater interlock"); break;
    case 22 : return("0x16 Initialization"); break;
    case 23 : return("0x17 Fuel bubble compensation"); break;
    case 24 : return("0x18 Fan cold start-up"); break;
    case 25 : return("0x19 Cold start enrichment"); break;
    case 26 : return("0x1a Cooling"); break;
    case 27 : return("0x1b Load change PL-FL"); break;
    case 28 : return("0x1c Ventilation"); break;
    case 29 : return("0x1d Load change FL-PL"); break;
    case 30 : return("0x1e New initialization"); break;
    case 31 : return("0x1f Controlled operation"); break;
    case 32 : return("0x20 Control iddle period"); break;
    case 33 : return("0x21 Soft start"); break;
    case 34 : return("0x22 Savety time"); break;
    case 35 : return("0x23 Purge"); break;
    case 36 : return("0x24 Start"); break;
    case 37 : return("0x25 Stabilization"); break;
    case 38 : return("0x26 Start ramp"); break;
    case 39 : return("0x27 Out of power"); break;
    case 40 : return("0x28 Interlock"); break;
    case 41 : return("0x29 Interlock ADR (Australian design rules)"); break;
    case 42 : return("0x2a Stabilization time"); break;
    case 43 : return("0x2b Change to controlled operation"); break;
    case 44 : return("0x2c Decision state"); break;
    case 45 : return("0x2d Prestart fuel supply"); break;
    case 46 : return("0x2e Glowing"); break;
    case 47 : return("0x2f Glowing power control"); break;
    case 48 : return("0x30 Delay lowering"); break;
    case 49 : return("0x31 Sluggish fan start"); break;
    case 50 : return("0x32 Additional glowing"); break;
    case 51 : return("0x33 Ignition interruption"); break;
    case 52 : return("0x34 Ignition"); break;
    case 53 : return("0x35 Intermittent glowing"); break;
    case 54 : return("0x36 Application monitoring"); break;
    case 55 : return("0x37 Interlock save to memory"); break;
    case 56 : return("0x38 Heater interlock deactivation"); break;
    case 57 : return("0x39 Output control"); break;
    case 58 : return("0x3a Circulating pump control"); break;
    case 59 : return("0x3b Initialization uP"); break;
    case 60 : return("0x3c Stray light interrogation"); break;
    case 61 : return("0x3d Prestart"); break;
    case 62 : return("0x3e Pre-ignition"); break;
    case 63 : return("0x3f Flame ignition"); break;
    case 64 : return("0x40 Flame stabilization"); break;
    case 65 : return("0x41 Combustion process parking heating"); break;
    case 66 : return("0x42 Combustion process suppl. heating"); break;
    case 67 : return("0x43 Combustion failure failure heating"); break;
    case 68 : return("0x44 Combustion failure suppl. heating"); break;
    case 69 : return("0x45 Heater off after run"); break;
    case 70 : return("0x46 Control iddle after run"); break;
    case 71 : return("0x47 After-run due to failure"); break;
    case 72 : return("0x48 Time-controlled after-run due to failure"); break;
    case 73 : return("0x49 Interlock circulation pump"); break;
    case 74 : return("0x4a Control iddle after parking heating"); break;
    case 75 : return("0x4b Control iddle after suppl. heating"); break;
    case 76 : return("0x4c Control iddle period suppl. heating with circulation pump"); break;
    case 77 : return("0x4d Circulation pump without heating function"); break;
    case 78 : return("0x4e Waiting loop overvoltage"); break;
    case 79 : return("0x4f Fault memory update"); break;
    case 80 : return("0x50 Waiting loop"); break;
    case 81 : return("0x51 Component test"); break;
    case 82 : return("0x52 Boost"); break;
    case 83 : return("0x53 Cooling"); break;
    case 84 : return("0x54 Heater interlock permanent"); break;
    case 85 : return("0x55 Fan iddle"); break;
    case 86 : return("0x56 Break away"); break;
    case 87 : return("0x57 Temperature interrogation"); break;
    case 88 : return("0x58 Prestart undervoltage"); break;
    case 89 : return("0x59 Accident interrogation"); break;
    case 90 : return("0x5a After-run solenoid valve"); break;
    case 91 : return("0x5b Fault memory update solenoid valve"); break;
    case 92 : return("0x5c Timer-controlled after-run solenoid valve"); break;
    case 93 : return("0x5d Startup attempt"); break;
    case 94 : return("0x5e Prestart extension"); break;
    case 95 : return("0x5f Combustion process"); break;
    case 96 : return("0x60 Timer-controlled after-run due to undervoltage"); break;
    case 97 : return("0x61 Fault memory update prior switch off"); break;
    case 98 : return("0x62 Ramp full load"); break;
  }
}

function wbus_parse() {
  var b = 0;
  var i = 0;

  var heater_response = false;

  for (i = 0; i <= wbus_buffer[1]+1; i++) {
    var wbus_data = parseInt(('00' + wbus_buffer[i].toString(16)).substr(-2),16);
    if (i === 0) {
      switch (wbus_data) {
        case 0x34:
//          console.log('From:\tMultiControl\tto:\tHeater.');
          break;
        case 0x43:
//          console.log('From:\tHeater\tto:\tMultiControl.');
          break;
        case 0x4f:
//          console.log('From:\tHeater\tto:\to:\tRaspberry PI.');
          heater_response = true;
          break;
        case 0xf4:
//          console.log('From:\tRaspberry PI\tto:\tHeater.');
          break;
      } 

      
//      for (b = 2; b <= wbus_length; b++) {
//        var wbus_byte = ('00' + wbus_buffer[b].toString(16)).substr(-2);
//        console.log("wbus_byte: " + wbus_byte);
//      }
    }

//    console.log(parseInt((wbus_buffer[i].toString(16)).substr(-2),16));

    if (heater_response && i == 2 && wbus_data == 0xd0) {
        if (parseInt(('00' + wbus_buffer[3].toString(16)).substr(-2),16) == 2)
        {
          webasto_data.status_ms  = (wbus_buffer[4] & 0x01) ? 1 : 0;
          webasto_data.status_shr = (wbus_buffer[4] & 0x10) ? 1 : 0;
        }
        if (parseInt((wbus_buffer[3].toString(16)).substr(-2),16) == 7)
        {
          webasto_data.status_os  = wbus_buffer[4];
        }
    }
  }

}

wbus.on('data', function(data) {
 
  var b = 0;
  var i = 0;

  if (webasto_active === 0) {
    webasto_active = 1;
  }


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

exports.heater_state = function() {
  return webasto_data.status_os;
}
function wbus_status() {
    wbus.write(webato_get_stat_3, function(err) {
      if (err) {
        return console.log('Error on write: ', err.message);
      }
    });
}

exports.on = function() {
    wbus.write(webato_turn_on, function(err) {
      if (err) {
        return console.log('Error on write: ', err.message);
      }
    });
}

exports.off = function() {
    wbus.write(webato_turn_off, function(err) {
      if (err) {
        return console.log('Error on write: ', err.message);
      }
    });
}

exports.open = function() {
  while (webasto_active !== 1 &&  webasto_active_retry <= 3 && wbus.isOpen() ) {
    wbus.write(webasto_init_0, function(err) {
      if (err) {
        return console.log('Error on write: ', err.message);
      }
    });
    wbus.flush();
    sleep.sleep(2);
    webasto_active_retry++;
  }
  var statusinterval = setInterval(function () {
     wbus_status();
  }, 2000);

}

exports.close = function() {
  wbus.close();
}

