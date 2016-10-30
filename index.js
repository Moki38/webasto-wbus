var serialport = require('serialport');
var term = require( 'terminal-kit' ).terminal;
var shell = require("shelljs");
var sleep = require('sleep');

var serial_device = '/dev/ttyWBUS';

var wbus = new serialport.SerialPort(String(serial_device), {
                baudrate: 2400,
                dataBits: 8,
                stopBits: 1,
                parity: 'even',
                parser: serialport.parsers.raw});

exports.init = function() {
  console.log("This is a message from the demo package");
}

