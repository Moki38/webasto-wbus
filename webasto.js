var serialport = require('serialport');
var term = require( 'terminal-kit' ).terminal;
var shell = require("shelljs");
var sleep = require('sleep');

var serial_device = '/dev/ttyWBUS';
  
// Send BREAK
//shell.exec('/data/webasto-wbus/sendbreak /dev/ttyWBUS', {async:false, silent:false});
//sleep.usleep(1500);

//
//
//
var recv_buffer       = new Buffer(30);
var recv_pos = 0;
var recv_length = 0;

var webato_init_x     = Buffer.from([0x34, 0x03, 0x21, 0x1e, 0x08]);		// Diagnostic
var webato_init_0     = Buffer.from([0xf4, 0x02, 0x38, 0xce]);		// Diagnostic
var webato_init_1     = Buffer.from([0xf4, 0x03, 0x51, 0x0a, 0xac]);	// W-BUS Version
var webato_init_2     = Buffer.from([0xf4, 0x03, 0x51, 0x0b, 0xad]);	// Device Name	
var webato_init_3     = Buffer.from([0xf4, 0x03, 0x51, 0x0c, 0xaa]);	// W-BUS Code
var webato_init_4     = Buffer.from([0xf4, 0x02, 0x38, 0xce]);		// Diagnostic

//var webato_get_stat_1 = Buffer.from([0xf4, 0x03, 0x51, 0x01, 0xa7]);
var webato_get_stat_1 = Buffer.from([0xf4, 0x03, 0x50, 0x02, 0xa5]);
var webato_get_stat_2 = Buffer.from([0xf4, 0x03, 0x50, 0x03, 0xa4]);
var webato_get_stat_3 = Buffer.from([0xf4, 0x03, 0x50, 0x07, 0xa0]);
var webato_get_stat_4 = Buffer.from([0xf4, 0x03, 0x50, 0x05, 0xa2]);
var webato_get_stat_5 = Buffer.from([0xf4, 0x03, 0x50, 0x0f, 0xa8]);

var webato_turn_on    = Buffer.from([0x34, 0x05, 0x2a, 0x21, 0xff, 0x4a, 0x8f]);
var webato_turn_off   = Buffer.from([0x34, 0x05, 0x2a, 0x21, 0xff, 0x47, 0x82]);
var webato_keep_alive = Buffer.from([0x34, 0x04, 0x44, 0x2a, 0x00, 0x5e]);
var webato_multi_on    = Buffer.from([0x34, 0x05, 0x2a, 0x21, 0xff, 0x47, 0x82]);
var webato_multi_off   = Buffer.from([0x34, 0x02, 0x10, 0x26]);

var webasto_run = 0;
var webasto_klive = 0;
var webasto_once = 1;

var webasto_active = 0;
var webasto_active_retry = 0;
//
// Global variables
//
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

//
//
//

var port = new serialport.SerialPort(String(serial_device), {
                baudrate: 2400,
		dataBits: 8,
		stopBits: 1,
		parity: 'even',
                parser: serialport.parsers.raw});

//
// Webasto Functions
//
function webasto_oper_state(os) {
  switch(parseInt(os)) {
    case -1 : term.white(""); break;
    case  0 : term.white("0x00 Burn Out"); break;
    case  1 : term.white("0x01 Deactivation"); break;
    case  2 : term.white("0x02 Burn Out ADR"); break;
    case  3 : term.white("0x03 Burn Out Ramp"); break;
    case  4 : term.white("0x04 Off State"); break;
    case  5 : term.white("0x05 Combustion process part load"); break;
    case  6 : term.white("0x06 Combustion process full load"); break;
    case  7 : term.white("0x07 Fuel supply"); break;
    case  8 : term.white("0x08 Combustion air fan start"); break;
    case  9 : term.white("0x09 Fuel supply interruption"); break;
    case 10 : term.white("0x0a Diagnostic state"); break;
    case 11 : term.white("0x0b Fuel pump interruption"); break;
    case 12 : term.white("0x0c EMF measurement"); break;
    case 13 : term.white("0x0d Debounce"); break;
    case 14 : term.white("0x0e Deactivation"); break;
    case 15 : term.white("0x0f Flame detector interrogation"); break;
    case 16 : term.white("0x10 Flame detector cooling"); break;
    case 17 : term.white("0x11 Flame detector measuring phase"); break;
    case 18 : term.white("0x12 Flame detector measuring phase ZUE"); break;
    case 19 : term.white("0x13 Fan start up"); break;
    case 20 : term.white("0x14 Glow plug ramp"); break;
    case 21 : term.white("0x15 Heater interlock"); break;
    case 22 : term.white("0x16 Initialization"); break;
    case 23 : term.white("0x17 Fuel bubble compensation"); break;
    case 24 : term.white("0x18 Fan cold start-up"); break;
    case 25 : term.white("0x19 Cold start enrichment"); break;
    case 26 : term.white("0x1a Cooling"); break;
    case 27 : term.white("0x1b Load change PL-FL"); break;
    case 28 : term.white("0x1c Ventilation"); break;
    case 29 : term.white("0x1d Load change FL-PL"); break;
    case 30 : term.white("0x1e New initialization"); break;
    case 31 : term.white("0x1f Controlled operation"); break;
    case 32 : term.white("0x20 Control iddle period"); break;
    case 33 : term.white("0x21 Soft start"); break;
    case 34 : term.white("0x22 Savety time"); break;
    case 35 : term.white("0x23 Purge"); break;
    case 36 : term.white("0x24 Start"); break;
    case 37 : term.white("0x25 Stabilization"); break;
    case 38 : term.white("0x26 Start ramp"); break;
    case 39 : term.white("0x27 Out of power"); break;
    case 40 : term.white("0x28 Interlock"); break;
    case 41 : term.white("0x29 Interlock ADR (Australian design rules)"); break;
    case 42 : term.white("0x2a Stabilization time"); break;
    case 43 : term.white("0x2b Change to controlled operation"); break;
    case 44 : term.white("0x2c Decision state"); break;
    case 45 : term.white("0x2d Prestart fuel supply"); break;
    case 46 : term.white("0x2e Glowing"); break;
    case 47 : term.white("0x2f Glowing power control"); break;
    case 48 : term.white("0x30 Delay lowering"); break;
    case 49 : term.white("0x31 Sluggish fan start"); break;
    case 50 : term.white("0x32 Additional glowing"); break;
    case 51 : term.white("0x33 Ignition interruption"); break;
    case 52 : term.white("0x34 Ignition"); break;
    case 53 : term.white("0x35 Intermittent glowing"); break;
    case 54 : term.white("0x36 Application monitoring"); break;
    case 55 : term.white("0x37 Interlock save to memory"); break;
    case 56 : term.white("0x38 Heater interlock deactivation"); break;
    case 57 : term.white("0x39 Output control"); break;
    case 58 : term.white("0x3a Circulating pump control"); break;
    case 59 : term.white("0x3b Initialization uP"); break;
    case 60 : term.white("0x3c Stray light interrogation"); break;
    case 61 : term.white("0x3d Prestart"); break;
    case 62 : term.white("0x3e Pre-ignition"); break;
    case 63 : term.white("0x3f Flame ignition"); break;
    case 64 : term.white("0x40 Flame stabilization"); break;
    case 65 : term.white("0x41 Combustion process parking heating"); break;
    case 66 : term.white("0x42 Combustion process suppl. heating"); break;
    case 67 : term.white("0x43 Combustion failure failure heating"); break;
    case 68 : term.white("0x44 Combustion failure suppl. heating"); break;
    case 69 : term.white("0x45 Heater off after run"); break;
    case 70 : term.white("0x46 Control iddle after run"); break;
    case 71 : term.white("0x47 After-run due to failure"); break;
    case 72 : term.white("0x48 Time-controlled after-run due to failure"); break;
    case 73 : term.white("0x49 Interlock circulation pump"); break;
    case 74 : term.white("0x4a Control iddle after parking heating"); break;
    case 75 : term.white("0x4b Control iddle after suppl. heating"); break;
    case 76 : term.white("0x4c Control iddle period suppl. heating with circulation pump"); break;
    case 77 : term.white("0x4d Circulation pump without heating function"); break;
    case 78 : term.white("0x4e Waiting loop overvoltage"); break;
    case 79 : term.white("0x4f Fault memory update"); break;
    case 80 : term.white("0x50 Waiting loop"); break;
    case 81 : term.white("0x51 Component test"); break;
    case 82 : term.white("0x52 Boost"); break;
    case 83 : term.white("0x53 Cooling"); break;
    case 84 : term.white("0x54 Heater interlock permanent"); break;
    case 85 : term.white("0x55 Fan iddle"); break;
    case 86 : term.white("0x56 Break away"); break;
    case 87 : term.white("0x57 Temperature interrogation"); break;
    case 88 : term.white("0x58 Prestart undervoltage"); break;
    case 89 : term.white("0x59 Accident interrogation"); break;
    case 90 : term.white("0x5a After-run solenoid valve"); break;
    case 91 : term.white("0x5b Fault memory update solenoid valve"); break;
    case 92 : term.white("0x5c Timer-controlled after-run solenoid valve"); break;
    case 93 : term.white("0x5d Startup attempt"); break;
    case 94 : term.white("0x5e Prestart extension"); break;
    case 95 : term.white("0x5f Combustion process"); break;
    case 96 : term.white("0x60 Timer-controlled after-run due to undervoltage"); break;
    case 97 : term.white("0x61 Fault memory update prior switch off"); break;
    case 98 : term.white("0x62 Ramp full load"); break;

  }
}

function webasto_init()
{
  term.brightYellow.moveTo (1, 20, "Connecting to W-BUS\n");
  while (webasto_active !== 1 &&  webasto_active_retry <= 3) {
    port.write(webato_init_0, function(err) {
      if (err) {
        return console.log('Error on write: ', err.message);
      }
    });
    port.flush();
    sleep.sleep(3);
    term.red("No response, retrying\n");
    webasto_active_retry++;
    
  }
}

function webasto_turnon() {
  webasto_klive = 1;
  port.write(webato_turn_on, function(err) {
    if (err) {
      return console.log('Error on write: ', err.message);
    }
  });
}

function webasto_turnoff() {
  webasto_klive = 0;
  port.write(webato_turn_off, function(err) {
    if (err) {
      return console.log('Error on write: ', err.message);
    }
  });
}

function webasto_keepalive() {
//  console.log("Keepalive");
  switch(webasto_run) {
  case 0:
    port.write(webato_get_stat_1, function(err) {
      if (err) {
        return console.log('Error on write: ', err.message);
      }
    });
    webasto_run++;
    break;
  case 1:
    port.write(webato_get_stat_2, function(err) {
      if (err) {
        return console.log('Error on write: ', err.message);
      }
    });
    webasto_run++;
    break;
  case 2:
    port.write(webato_get_stat_3, function(err) {
      if (err) {
        return console.log('Error on write: ', err.message);
      }
    });
    webasto_run++;
    break;
  case 3:
    port.write(webato_get_stat_4, function(err) {
      if (err) {
        return console.log('Error on write: ', err.message);
      }
    });
    webasto_run++;
    break;
  case 4:
    port.write(webato_get_stat_5, function(err) {
      if (err) {
        return console.log('Error on write: ', err.message);
      }
    });
    webasto_run=0;
    break;
  }

  if (webasto_klive) {
    port.write(webato_keep_alive, function(err) {
      if (err) {
        return console.log('Error on write: ', err.message);
      }
    });

  }
}

function webasto_status()
{
  port.write(webato_get_stat_3, function(err) {
    if (err) {
      return console.log('Error on write: ', err.message);
    }
  });
}

function webasto_display()
{
  term.white.moveTo(1, 1, "CAF: %d",webasto_data.status_caf);
  if (webasto_data.status_caf)  { term.yellow.moveTo(6, 1, "ON "); } else { term.yellow.moveTo(6, 1, "OFF"); }
  term.white.moveTo(1, 2, "FP : %d",webasto_data.status_fp);
  if (webasto_data.status_fp)  { term.yellow.moveTo(6, 2, "ON "); } else { term.yellow.moveTo(6, 2, "OFF"); }
  term.white.moveTo(1, 3, "GP : %d",webasto_data.status_gp);
  if (webasto_data.status_gp)  { term.yellow.moveTo(6, 3, "ON "); } else { term.yellow.moveTo(6, 3, "OFF"); }
  term.white.moveTo(1, 4, "CP : %d",webasto_data.status_cp);
  if (webasto_data.status_cp)  { term.yellow.moveTo(6, 4, "ON "); } else { term.yellow.moveTo(6, 4, "OFF"); }
  term.white.moveTo(1, 5, "VFR: %d",webasto_data.status_vfr);
  if (webasto_data.status_vfr) { term.yellow.moveTo(6, 5, "ON "); } else { term.yellow.moveTo(6, 5, "OFF"); }
  term.white.moveTo(1, 6, "MS : %d",webasto_data.status_ms);
  if (webasto_data.status_ms)  { term.green.moveTo(6, 6, "ON "); } else { term.green.moveTo(6, 6, "OFF"); }
  term.white.moveTo(1, 7, "SHR: %d",webasto_data.status_shr);
  if (webasto_data.status_shr) { term.green.moveTo(6, 7, "ON "); } else { term.green.moveTo(6, 7, "OFF"); }
  term.white.moveTo(1, 8, "FI : %d",webasto_data.status_fi);
  if (webasto_data.status_fi)  { term.red.moveTo(6, 8, "ON "); } else { term.red.moveTo(6, 8, "OFF"); }
  term.white.moveTo(1, 9, "FD : %d",webasto_data.status_fd);
  if (webasto_data.status_fd)  { term.red.moveTo(6, 9, "ON "); } else { term.red.moveTo(6, 8, "OFF"); }

  term.white.moveTo(20, 1, "Temp  (C):             ");
  term.white.moveTo(20, 1, "Temp  (C): " + (parseInt(webasto_data.status_temp)-50));
  term.white.moveTo(20, 2, "Volt  (V):             ");
  term.white.moveTo(20, 2, "Volt  (V): " + Math.floor(((parseInt(webasto_data.status_mvolt1)*256)+parseInt(webasto_data.status_mvolt2))/10)/100);
  term.white.moveTo(20, 3, "Power (W):             ");
  term.white.moveTo(20, 3, "Power (W): " + ((parseInt(webasto_data.status_hp1)*256)+parseInt(webasto_data.status_hp2))/10);
  term.white.moveTo(20, 4, "FD Ohm(o):             ");
  term.white.moveTo(20, 4, "FD Ohm(o): " + ((parseInt(webasto_data.status_fdr1)*256)+parseInt(webasto_data.status_fdr2))/100000);

  term.white.moveTo(20, 6, "GP Power :             ");
  term.white.moveTo(20, 6, "GP Power : " + ((parseInt(webasto_data.status_gpp))*2));
  term.white.moveTo(20, 7, "FP Power :             ");
  term.white.moveTo(20, 7, "FP Power : " + ((parseInt(webasto_data.status_fpf))*2));
  term.white.moveTo(20, 8, "AF Power :             ");
  term.white.moveTo(20, 8, "AF Power : " + ((parseInt(webasto_data.status_afp))*2));

  term.white.moveTo(1,18, "Operating State:                                                                   ");
  term.white.moveTo(1,18, "Operating State: ");
  webasto_oper_state(webasto_data.status_os);
  term.moveTo( 1 , 21) ;
}

function webasto_parse()
{
  var i = 0;
  var heater_response = false;

  if (webasto_once) {
      webasto_init();
    webasto_once = 0;
  }

  
//  webasto_status();
  

  for (i = 0; i <= recv_buffer[1]+1; i++) {
    var h = recv_buffer[i].toString(16);

    if (i === 0) {
      switch (h) {
      case '34':
        term.green.moveTo(1, 12,"Multi  :                                                   ");
        term.green.moveTo(1, 12,"Multi  : ");
        break;
      case '43':
        term.blue.moveTo(1, 13, "Heater :                                                   ");
        term.blue.moveTo(1, 13, "Heater : ");
        break;
      case '4f':
        term.blue.moveTo(1, 14, "Evo 40 :                                                   ");
        term.blue.moveTo(1, 14, "Evo 40 : ");
        heater_response = true;
        break;
      case 'f4':
        term.cyan.moveTo(1, 15, "Commnd :                                                   ");
        term.cyan.moveTo(1, 15, "Commnd : ");
        break;
      default:
        term.white.moveTo(1, 16, "Data  :                                                   ");
        term.white.moveTo(1, 16, "Data  : ");
        break;
      }
    }

    if (heater_response && i == 2 && h == 'd0') {
        if (recv_buffer[3].toString(16) == '2')
        { 
          webasto_data.status_ms  = (recv_buffer[4] & 0x01) ? 1 : 0;
          webasto_data.status_shr = (recv_buffer[4] & 0x10) ? 1 : 0;
        }
        if (recv_buffer[3].toString(16) == '3')
        { 
          webasto_data.status_caf = (recv_buffer[4] & 0x01) ? 1 : 0;
          webasto_data.status_gp  = (recv_buffer[4] & 0x02) ? 1 : 0;
          webasto_data.status_fp  = (recv_buffer[4] & 0x04) ? 1 : 0;
          webasto_data.status_cp  = (recv_buffer[4] & 0x08) ? 1 : 0;
          webasto_data.status_vfr = (recv_buffer[4] & 0x10) ? 1 : 0;
          webasto_data.status_nsh = (recv_buffer[4] & 0x20) ? 1 : 0;
          webasto_data.status_fi  = (recv_buffer[4] & 0x40) ? 1 : 0;
        }
        if (recv_buffer[3].toString(16) == '5')
        { 
          webasto_data.status_temp  = recv_buffer[4];
          webasto_data.status_mvolt1  = recv_buffer[5];
          webasto_data.status_mvolt2  = recv_buffer[6];
          webasto_data.status_fd  = recv_buffer[7];
          webasto_data.status_hp1  = recv_buffer[8];
          webasto_data.status_hp2  = recv_buffer[9];
          webasto_data.status_fdr1  = recv_buffer[10];
          webasto_data.status_fdr2  = recv_buffer[11];
        }
        if (recv_buffer[3].toString(16) == '7')
        { 
          webasto_data.status_os  = recv_buffer[4];
        }
        if (recv_buffer[3].toString(16) == 'f')
        { 
          webasto_data.status_gpp  = recv_buffer[4];
          webasto_data.status_fpf  = recv_buffer[5];
          webasto_data.status_afp  = recv_buffer[6];
        }
    }

    if (parseInt(recv_buffer[i]) <= 15) {
      term.white("0" + h + " ");
    } else {
      term.white(h + " ");
    }
  }
//  term.white("\n");

}

port.on('data', function(data) {

  if (webasto_active === 0) {
    webasto_active = 1;
    //console.log("webasto_active = 1");
  }

  var x = 0;
  var i = 0;
  var xor = 0;

  if (data.length > 1) {
    term.red.moveTo(1, 20, "Buffer overrun error: " + data.toString('hex') + "\n");
  } else {
//    term.red.moveTo(1, 20, "                                                                    \n");
    switch (data.toString('hex')) {
      case '34':
        recv_pos = 0; 
        recv_buffer[0] = parseInt(data.toString('hex'),16);
        recv_pos++;
        break;
      case '43':
        recv_pos = 0; 
        recv_buffer[0] = parseInt(data.toString('hex'),16);
        recv_pos++;
        break;
      case '4f':
        recv_pos = 0; 
        recv_buffer[0] = parseInt(data.toString('hex'),16);
        recv_pos++;
        break;
      case 'f4':
        recv_pos = 0; 
        recv_buffer[0] = parseInt(data.toString('hex'),16);
        recv_pos++;
        break;
      default:
        if (recv_pos === 1) {
          recv_length = data.toString('hex');
          recv_buffer[1] = parseInt(data.toString('hex'),16);
          recv_pos++;
        } else {
            recv_buffer[recv_pos] = parseInt(data.toString('hex'),16);
          if (recv_pos > parseInt(recv_length,16)) {
            for (i = 0; i <= recv_pos; i++) {
              if (i < recv_pos) {
                xor = xor^recv_buffer[i];
              } else {
                if (xor == recv_buffer[recv_pos]) {
                    webasto_parse();
                } else {
//                  console.log("xor failed : " + xor); 
                }
              }
            }

          }
          recv_pos++;
        }
    }
  }
});

function terminate()
{
    term.grabInput( false ) ;
    setTimeout( function() { process.exit() } , 100 ) ;
}

term.clear();
term.grabInput( { mouse: 'button' } ) ;

var displayinterval = setInterval(function () {
     webasto_display();
     webasto_keepalive();
  }, 5000);

term.on( 'key' , function( name , matches , data ) {
//    term.moveTo( 1 , 15 , "Keyboard event %s, %s.\n" , name , data ) ;
//    console.log( "'key' event:" , name ) ;
    if ( matches.indexOf ('1') >= 0 ) { 
//      console.log("Key '1' pressed");
      webasto_status();

    }
    if ( matches.indexOf ('2') >= 0 ) { 
      console.log("Key '2' pressed");
	webasto_turnon();
    }
    if ( matches.indexOf ('3') >= 0 ) { 
      console.log("Key '3' pressed");
	webasto_turnoff();

    }
    if ( matches.indexOf( 'CTRL_C' ) >= 0 ) {
      term.green( 'CTRL-C received...\n' ) ;
      terminate() ;
    }
} ) ;

