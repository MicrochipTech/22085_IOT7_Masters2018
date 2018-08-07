/*
 * sensorBoard_console.h
 *
 * Created: 7/31/2018 10:27:18 PM
 *  Author: I16658
 */ 


#ifndef SENSORBOARD_CONSOLE_H_
#define SENSORBOARD_CONSOLE_H_


/**
 *  Configure console.
 */
#include <asf.h>
#define CONF_STDIO_USART_MODULE  SERCOM3
#define CONF_STDIO_MUX_SETTING   USART_RX_1_TX_0_XCK_1
#define CONF_STDIO_PINMUX_PAD0   PINMUX_PA22C_SERCOM3_PAD0
#define CONF_STDIO_PINMUX_PAD1   PINMUX_PA23C_SERCOM3_PAD1
#define CONF_STDIO_PINMUX_PAD2   PINMUX_UNUSED
#define CONF_STDIO_PINMUX_PAD3   PINMUX_UNUSED
#define CONF_STDIO_BAUDRATE      115200

void configure_console(void);



#endif /* SENSORBOARD_CONSOLE_H_ */