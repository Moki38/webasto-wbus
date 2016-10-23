var serialport = require('serialport');
var term = require( 'terminal-kit' ).terminal;
var shell = require("shelljs");
var sleep = require('sleep');

var serial_device = '/dev/ttyWBUS';
  
// Send BREAK
shell.exec('/data/webasto-wbus/sendbreak /dev/ttyWBUS', {async:false, silent:false});
sleep.usleep(1500);

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

var webato_get_stat_1 = Buffer.from([0xf4, 0x03, 0x51, 0x01, 0xa7]);
var webato_get_stat_2 = Buffer.from([0xf4, 0x03, 0x50, 0x0f, 0xa8]);
var webato_get_stat_3 = Buffer.from([0x34, 0x03, 0x50, 0x07, 0x60]);

var webato_turn_on    = Buffer.from([0xf4, 0x03, 0x20, 0x10, 0xc4]);
var webato_keep_alive = Buffer.from([0xf4, 0x03, 0x20, 0x00, 0xd4]);
var webato_turn_off   = Buffer.from([0xf4, 0x02, 0x10, 0xe5]);

var webasto_run = 0;
var webasto_klive = 0;
var webasto_once = 1;

var webasto_active = 0;
var webasto_active_retry = 0;
//
// Global variables
//
var webasto_data = {
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
function webasto_init()
{
//  term.moveTo( 1 , 24 , "ssssssheyboard event %s, %s.\n" , name , data ) ;
  term.brightYellow ("Connecting to W-BUS\n");
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

function webasto_init2()
{

  port.write(webato_init_0, function(err) {
    if (err) {
      return console.log('Error on write: ', err.message);
    }
  });
  sleep.usleep(500);
  port.write(webato_init_1, function(err) {
    if (err) {
      return console.log('Error on write: ', err.message);
    }
  });
  sleep.usleep(500);
  port.write(webato_init_2, function(err) {
    if (err) {
      return console.log('Error on write: ', err.message);
    }
  });
  sleep.usleep(500);
  port.write(webato_init_3, function(err) {
    if (err) {
      return console.log('Error on write: ', err.message);
    }
  });
  sleep.usleep(500);
  port.write(webato_init_4, function(err) {
    if (err) {
      return console.log('Error on write: ', err.message);
    }
  });

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

  port.write(webato_get_stat_3, function(err) {
    if (err) {
      return console.log('Error on write: ', err.message);
    }
  });
}

function webasto_status()
{
  port.write(webato_get_stat_1, function(err) {
    if (err) {
      return console.log('Error on write: ', err.message);
    }
  });
}


function webasto_status2()
{
  switch (webasto_run) {
    case 0:
      webasto_run = 1;
      sleep.usleep(500);
      port.write(webato_get_stat_1, function(err) {
        if (err) {
          return console.log('Error on write: ', err.message);
        }
      });
      break;
    case 1:
      webasto_run = 0;
      sleep.usleep(500);
      port.write(webato_get_stat_2, function(err) {
        if (err) {
          return console.log('Error on write: ', err.message);

        }
      });
      break;
  }
}

function webasto_display()
{
  var i = 0;

  if (webasto_once) {
      webasto_init();
    webasto_once = 0;
  }

  
//  webasto_status();
  

  for (i = 0; i <= recv_buffer[1]+1; i++) {
    var h = recv_buffer[i].toString(16);
    if (h < 16) {
      term.white("0" + h + " ");
    } else {
      term.white(h + " ");
   }
  }
  term.white("\n");

}

port.on('data', function(data) {
//    console.log("Data: " + data.toString('hex'));

  if (webasto_active === 0) {
    webasto_active = 1;
    console.log("webasto_active = 1");
  }

  var x = 0;
  var i = 0;
  var xor = 0;

  if (data.length > 1) {
    term.red("Buffer overrun error\n" + data.toString('hex'));
  } else {
    switch (data.toString('hex')) {
      case '34':
//        term.green("Multi  : " + data.toString('hex') + "\n");
        recv_pos = 0; 
        recv_buffer[0] = parseInt(data.toString('hex'),16);
        recv_pos++;
        break;
      case '43':
//        term.blue("Heater : " + data.toString('hex') + "\n");
        recv_pos = 0; 
        recv_buffer[0] = parseInt(data.toString('hex'),16);
        recv_pos++;
        break;
      case '4f':
//        term.blue("Evo 40 : " + data.toString('hex') + "\n");
        recv_pos = 0; 
        recv_buffer[0] = parseInt(data.toString('hex'),16);
        recv_pos++;
        break;
      case 'f4':
//        term.cyan("Commnd : " + data.toString('hex') + "\n");
        recv_pos = 0; 
        recv_buffer[0] = parseInt(data.toString('hex'),16);
        recv_pos++;
        break;
      default:
//        term.white("Data  : " + data.toString('hex') + "\n");
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
//                  console.log("xor correct: " + xor);

                    webasto_display();

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
//     webasto_display();
     webasto_keepalive();
  }, 5000);

term.on( 'key' , function( name , matches , data ) {
//    term.moveTo( 1 , 15 , "Keyboard event %s, %s.\n" , name , data ) ;
//    console.log( "'key' event:" , name ) ;
    if ( matches.indexOf ('1') >= 0 ) { 
//      console.log("Key '1' pressed");
      webasto_status();

    }
    if ( matches.indexOf( 'CTRL_C' ) >= 0 ) {
      term.green( 'CTRL-C received...\n' ) ;
      terminate() ;
    }
} ) ;

