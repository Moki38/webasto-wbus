var term = require( 'terminal-kit' ).terminal;
//var wbus = require( 'webasto-wbus' );
var wbus = require( './index.js' );

function webasto_display() {

  var webasto_data = wbus.state();

  term.white.moveTo(10, 20, "Webasto State:                                                ");
  term.white.moveTo(10, 20, "Webasto State: %s", webasto_data.status_os);
}

function terminate()
{
    term.grabInput( false ) ;
    wbus.close();
    setTimeout( function() { process.exit() } , 100 ) ;
}

term.clear();
wbus.open();
term.grabInput( { mouse: 'button' } ) ;

var displayinterval = setInterval(function () {
     webasto_display();
  }, 1000);

term.on( 'key' , function( name , matches , data ) {
    if ( matches.indexOf ('1') >= 0 ) {
      wbus.on();
      term.yellow(1,22,'Key 1 received...\n' ) ;
    }
    if ( matches.indexOf ('2') >= 0 ) {
      wbus.off();
      term.yellow(1,22,'Key 2 received...\n' ) ;
    }
    if ( matches.indexOf( 'CTRL_C' ) >= 0 ) {
      term.green( 'CTRL-C received...\n' ) ;
      terminate() ;
    }
} ) ;

