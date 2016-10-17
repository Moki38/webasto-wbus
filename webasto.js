var serialport = require('serialport');
var term = require( 'terminal-kit' ).terminal;

var serial_device = '/dev/ttyWBUS';

//
//
//
var webato_init_1     = Buffer.from([0xf7, 0x03, 0x51, 0x0a, 0xac]);	// W-BUS Version
var webato_init_2     = Buffer.from([0xf7, 0x03, 0x51, 0x0b, 0xad]);	// Device Name	
var webato_init_3     = Buffer.from([0xf7, 0x03, 0x51, 0x0c, 0xaa]);	// W-BUS Code
var webato_init_4     = Buffer.from([0xf7, 0x02, 0x38, 0xcd]);		// Diagnostic

var webato_get_stat_1 = Buffer.from([0xf7, 0x03, 0x50, 0x0f, 0xa8]);
var webato_get_stat_2 = Buffer.from([0xf7, 0x03, 0x50, 0x0f, 0xa8]);

var webato_turn_on    = Buffer.from([0xf7, 0x03, 0x20, 0x10, 0xc4]);
var webato_keep_alive = Buffer.from([0xf7, 0x03, 0x20, 0x00, 0xd4]);
var webato_turn_off   = Buffer.from([0xf7, 0x02, 0x10, 0xe5]);

var webasto_run = 0;
var webasto_klive = 0;
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
var port = new serialport.SerialPort(serial_device, {
                baudrate: 2400,
		dataBits: 8,
		stopBits: 1,
		parity: 'even'
                parser: serialport.parsers.raw)});

//
// Webasto Functions
//
function webasto_init()
{
  // Send BREAK

  port.write(webato_init_1, function(err) {
    if (err) {
      return console.log('Error on write: ', err.message);
    }
  });
  port.write(webato_init_2, function(err) {
    if (err) {
      return console.log('Error on write: ', err.message);
    }
  });
  port.write(webato_init_3, function(err) {
    if (err) {
      return console.log('Error on write: ', err.message);
    }
  });
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
  switch (webasto_run) {
    case 0:
      webasto_run = 1;
      port.write(webato_get_stat_1);
      break;
    case 1:
      webasto_run = 0;
      port.write(webato_get_stat_2);
      break;
	
  }
}

function webasto_display()
{

}

port.on('data', function(data) {
  console.log("data.tostring('hex'));

});

function terminate()
{
    term.grabInput( false ) ;
    setTimeout( function() { process.exit() } , 100 ) ;
}

term.clear();

var displayinterval = setInterval(function () {
     webasto_display();
     webasto_keepalive();
  }, 500);

term.on( 'key' , function( name , matches , data ) {
//    term.moveTo( 1 , 15 , "Keyboard event %s, %s.\n" , name , data ) ;
//    console.log( "'key' event:" , name ) ;
    if ( matches.indexOf( 'CTRL_C' ) >= 0 ) {
      term.green( 'CTRL-C received...\n' ) ;
      terminate() ;
    }
} ) ;

