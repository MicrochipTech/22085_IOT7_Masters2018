/**
 * \file
 * \brief  Google Cloud Platform IOT Core Example (SAMD21/SAMW25)
 *
 * \copyright (c) 2017 Microchip Technology Inc. and its subsidiaries.
 *            You may use this software and any derivatives exclusively with
 *            Microchip products.
 *
 * \page License
 * 
 * (c) 2017 Microchip Technology Inc. and its subsidiaries. You may use this
 * software and any derivatives exclusively with Microchip products.
 * 
 * THIS SOFTWARE IS SUPPLIED BY MICROCHIP "AS IS". NO WARRANTIES, WHETHER
 * EXPRESS, IMPLIED OR STATUTORY, APPLY TO THIS SOFTWARE, INCLUDING ANY IMPLIED
 * WARRANTIES OF NON-INFRINGEMENT, MERCHANTABILITY, AND FITNESS FOR A
 * PARTICULAR PURPOSE, OR ITS INTERACTION WITH MICROCHIP PRODUCTS, COMBINATION
 * WITH ANY OTHER PRODUCTS, OR USE IN ANY APPLICATION.
 * 
 * IN NO EVENT WILL MICROCHIP BE LIABLE FOR ANY INDIRECT, SPECIAL, PUNITIVE,
 * INCIDENTAL OR CONSEQUENTIAL LOSS, DAMAGE, COST OR EXPENSE OF ANY KIND
 * WHATSOEVER RELATED TO THE SOFTWARE, HOWEVER CAUSED, EVEN IF MICROCHIP HAS
 * BEEN ADVISED OF THE POSSIBILITY OR THE DAMAGES ARE FORESEEABLE. TO THE
 * FULLEST EXTENT ALLOWED BY LAW, MICROCHIPS TOTAL LIABILITY ON ALL CLAIMS IN
 * ANY WAY RELATED TO THIS SOFTWARE WILL NOT EXCEED THE AMOUNT OF FEES, IF ANY,
 * THAT YOU HAVE PAID DIRECTLY TO MICROCHIP FOR THIS SOFTWARE.
 * 
 * MICROCHIP PROVIDES THIS SOFTWARE CONDITIONALLY UPON YOUR ACCEPTANCE OF THESE
 * TERMS.
 */

#include "asf.h"
#include "config.h"
#include "time_utils.h"
#include "sensorBoard_console.h"

#if !SAM0
#include "genclk.h"
#endif

/* Tasks */
#include "wifi_task.h"
#include "client_task.h"
#include "sensor_task.h"
#include "atca_kit_client.h"
#include "led.h"
#include "button.h"

/* Paho Client Timer */
#include "timer_interface.h"

/* Module globals for SAM0 */
struct usart_module  cdc_uart_module;
struct tc_module     tc3_inst;
struct rtc_module    rtc_instance;

/* Initialize an RTC (or 1 second timer) */
static void configure_rtc(void)
{
    struct rtc_count_config config_rtc_count;
    rtc_count_get_config_defaults(&config_rtc_count);
    //config_rtc_count.continuously_update = true;

    rtc_count_init(&rtc_instance, RTC, &config_rtc_count);

    rtc_count_enable(&rtc_instance);

}

void update_timers(void)
{
    wifi_timer_update();
    client_timer_update();
    TimerCallback();
    atca_kit_timer_update();
}

/* Timer callback function */
static void periodic_timer_cb(struct tc_module *const module)
{
    update_timers();
}


/* Configure a periodic timer for driving various counters */
static void configure_periodic_timer(void)
{
    uint32_t counts;

    struct tc_config config_tc;
    tc_get_config_defaults(&config_tc);

    /* For ease connect to the 32kHz source rather than the PLL */
    config_tc.clock_source = GCLK_GENERATOR_1;
    config_tc.wave_generation = TC_WAVE_GENERATION_MATCH_FREQ;

    /* Calculate the match count required */
    counts = TIMER_UPDATE_PERIOD * system_gclk_gen_get_hz(config_tc.clock_source);
    counts /= 1000;

    /* Set the match value that will trigger the interrupt */
    config_tc.counter_16_bit.compare_capture_channel[0] = counts;

    /* Set up the module */
    tc_init(&tc3_inst, TC4, &config_tc);

    /* Set up the interrupt */
    tc_register_callback(&tc3_inst, periodic_timer_cb, TC_CALLBACK_OVERFLOW);
    tc_enable_callback(&tc3_inst, TC_CALLBACK_OVERFLOW);

    /* Enable the timer */
    tc_enable(&tc3_inst);

}



/**
 * \brief Main application function.
 *
 * Application entry point.
 *
 * \return program return value.
 */
int main(void)
{
    /* Initialize the board. */
	system_init();

    /* Enable basic drivers */
    delay_init();

#if SAM0
    /* Enable Interrupts for Cortex-M0 */
    system_interrupt_enable_global();
#endif

	initialise_led();
	initialise_button();
	/* Initialize the UART console. */
	configure_console();
    /* Print a diagnostic message to the console */
    DEBUG_PRINTF("Starting Example...\r\n");
	
    /* Initialize the RTC */
    configure_rtc();

    /* Set the local configuration for the cryptographic device being used */
    config_crypto();

    /* Initialize a periodic timer */
    configure_periodic_timer();

    /* Initialize the USB HID interface */
    usb_hid_init();



    config_print_public_key();

    for(;;)
    {
        /* Handle WIFI state machine */
        wifi_task();

        /* Handle Data Interface */
        atca_kit_main_handler();

        /* Allows the kit protocol interface to have exclusive control
         of the I2C bus when it needs it */
        if(!atca_kit_lock())
        {
            /* Handle Client State Machine */
            client_task();

            /* Handle Sensor State Machine */
            sensor_task();
        }
    }

	return 0;
}
