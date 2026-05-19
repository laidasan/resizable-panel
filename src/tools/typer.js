import { is } from 'ramda'

export const isNumber = value => is(Number)(value)

export const isString = value => is(String)(value)

export const isNotNumber = value => value !== value