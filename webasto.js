var serialport = require('serialport');
var term = require( 'terminal-kit' ).terminal;

//
//
//
var port = new serialport.SerialPort(config.vedirect.device[0], {
                baudrate: 2400,
                parser: serialport.parsers.raw)});

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

var webasto_run = 0;

//
// Webasto Functions
//
function webasto_init()
{

}


function webasto_status()
{
  switch (webasto_run) {
    case 0:
      webasto_run = 1;
      break;
    case 1:
      webasto_run = 0;
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
  }, 500);

term.on( 'key' , function( name , matches , data ) {
//    term.moveTo( 1 , 15 , "Keyboard event %s, %s.\n" , name , data ) ;
//    console.log( "'key' event:" , name ) ;
    if ( matches.indexOf( 'CTRL_C' ) >= 0 ) {
      term.green( 'CTRL-C received...\n' ) ;
      terminate() ;
    }
} ) ;

