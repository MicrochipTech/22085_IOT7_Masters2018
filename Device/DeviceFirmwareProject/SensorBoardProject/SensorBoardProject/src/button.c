#include <asf.h>
#include "stdio.h"
#include "string.h"
#include "button.h"
#include "conf_board.h"

void initialise_button(void)
{
	/* Set buttons as inputs */
	struct port_config config_port_pin;
	port_get_config_defaults(&config_port_pin);
	config_port_pin.direction = PORT_PIN_DIR_INPUT;
	config_port_pin.input_pull = PORT_PIN_PULL_DOWN;
	port_pin_set_config(SW1_PIN, &config_port_pin);
	port_pin_set_config(SW2_PIN, &config_port_pin);
	port_pin_set_config(SW3_PIN, &config_port_pin);

}
