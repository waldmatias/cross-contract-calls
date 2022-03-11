## Guía para llamadas entre Contratos (Cross-Contract)

El protocolo NEAR permite la creación de transacciones en el código de un contrato. De esta nanera considera los casos de uso mas comunes, como llamar a un contrato desde otro, pero tambien patrones de uso mas avanzados, como usar un contrato como fábrica (Factory) para generar, o servir como Proxy, a otros contratos. El mecanismo en si tiene muchos nombres que generan confusión al principio, pero luego uno se da cuenta de que todo el mundo está hablando de diferentes partes de un mismo elefante, solo que visto desde perspectivas diferentes. 

### Recibos (Receipts)

Todas las llamadas entre contratos (también conocidas como "xcc") utilizan las mismas estructuras de datos: `ActionReceipts` y `DataReceipts`.

- `ActionReceipts` representan una transacción *planificada, garantizada*, interna a la red NEAR, luego que la firma haya sido verificada. 
- `DataReceipts` representan el resultado de una transacción completada enrutada a algún destino. 

Puede leer más sobre estos conceptos en la [documentación técnica](https://nomicon.io/RuntimeSpec/Receipts.html).

### Niveles de Abstracción

Existen dos (2) niveles de abstracción en el SDK de NEAR para AssemblyScript y Rust. El nivel más alto es el recomendado para los novatos a la plataforma, ya que es más amigable para los desarrolladores. Los archivos incluidos en este módulo proveen ejemplos de cada uno de estos niveles, ofreciendo suficiente contexto (esperamos) que permita entender claramente como usarlos.

- **Alto Nivel**:
  - API de llamadas de funciones simples (Function Call API) \
    Recomendada cuando se necesita realizar una llamada a una función, o varias llamadas a funciones entre contratos. Esta API es bastante similar entre sus versiones de AssemblyScript y Rust, con algunas diferencias menores. 
  - API de Acciones por Lote (Batch Actions API) \ 
    Recomendada cuando se aplica cualquier tipo de [`Action`]() en el código del contrato. 
    Esta API es bastante similar entre sus versiones de AssemblyScript y Rust, con algunas diferencias menores. 

- **Bajo Nivel**: \
  No recomendado para uso general, pero muy interesante para aprender sobre cómo los SDK de NEAR funcionan internamente, ya que revela el API de la máquina virtual de NEAR. 
  Esta API es muy similar entre sus versiones en AssemblyScript y Rust a la hora de programar contratos, ya que es una interfaz directa con la máquina virtual. 

### Archivos en éste Módulo

```
contracts
└── 00.orientation
    ├── README-ES.md                        <-- este archivo
    ├── simulation
    │   ├── Cargo.toml
    │   └── src
    │       ├── lib.rs                      <-- pruebas de simulación
    │       ├── local.rs                    <-- interfaz de contrato 00-local
    │       └── remote.rs                   <-- interfaz de contrato 00-remote
    └── src
        ├── 00-local
        │   ├── __tests__
        │   │   └── index.unit.spec.ts      <-- Pruebas unitarias para el contrato "00-local"
        │   ├── asconfig.json               <-- Ayudante de configuración para el compilador
        │   └── assembly
        │       └── index.ts                <-- contrato 00-local
        └── 00-remote
            ├── __tests__
            │   └── index.unit.spec.ts
            ├── asconfig.json
            └── assembly
                └── index.ts
```

### Preguntas clave

Existen algunas preguntas clave que generalmente surgen debido al contenido de este módulo, incluyendo: 

- Cuales son las ventajas y desventajas de usar uno u otro nivel de abstracción?
  - Hay una diferencia en el costo de almacenamiento, dependiente si se usa el API de alto nivel versus el API de bajo nivel. 
  - Hay una diferencia asociada al costo de gas usado (`burnt_gas`) para cada una de estas llamadas. 

- Cómo son las "Promises" reconciliadas en la blockchain? 
  - Las "Promises" en la plataforma NEAR son el nombre amigable, para los desarrolladores, de los recibos `ActionReceipt` y `DataReceipt`.
  - Las "Promises" se reconcilian en los límites de las funciones, y hasta el momento no hay soporte para un mecanismo como `await` en el ámbito (scope) de una función en un contrato. 
  - El valor de retorno de un "Promise" estará disponible en un bloque futuro, y hay únicamente dos maneras de capturar este valor: 
    1. Como el valor de retorno de la función exportada que eventualmente inició la llamada a la Promise, aunque indique que retorna `void`.
    2. Como los "resultados de la Promise", capturados por una función callback. 

## Conceptos clave de llamadas entre contratos

La posibilidad de llamar a un método de un contrato, desde otro contrato, es una funcionalidad invaluable en NEAR, debido a la manera en que están relacionadas las cuentas, contratos, y fragmentos (shards) en el protocolo NEAR. 

Cada cuenta en NEAR puede tener a lo sumo un contrato. Las cuentas de usuario generalmente no contienen un contrato mientras que las cuentas de DApps _si_ lo contienen. Algunas DApps hasta pueden requerir un sistema de contratos correlacionados que coordinan el trabajo de la DApp, en cuyo caso estos contratos estarán, probablemente, contenidos en subcuentas, un esquema válido de nombres para cuentas parecido a DNS. Por ejemplo, `dapp.near` puede ser el nivel de cuenta más alto, teniendo subcuentas como `module1.dapp.near`, `module2.dapp.near`, etc. para cada una de las partes correlacionadas de la DApp. 

Las cuentas "viven" en un único fragmento (shard) al cual califican de "hogar". Con esto queremos decir: todo su estado es almacenado en un único fragmento, y todas las llamadas a un contrato en esa cuenta, son enrutadas en la red a los nodos que validan a ese fragmento. Adicionalmente, el protocolo se reserva el derecho de redistribuir cuentas entre los fragmentos, lo cual beneficia a la red ya que aisla cuentas con alta demanda (es decir, contratos) a un fragment propio donde no afectarán el ancho de banda de todos los otros fragmentos del sistema. Al día de escribir este contenido, NEAR MainNet (la red principal) tiene un solo fragmento, pero el equipo de desarrollo NEAR Core y los Guilds en la comunidad trabajan arduamente y progresan a una red multi-fragmento (multi-shard).

Los desarrolladores que entiendan y vean las ventajas de usar este modelo para cuentas, reconoceran varios beneficios: 

- Cualquier contrato existente en la red (es decir, contratos core) pueden ser reutilizados en nuevas DApps mediante llamadas entre contratos. 
- DApps con puntos "hot spots" en el código del contrato (puntos con costo computacional elevado), pueden reorganizarse y separarse en múltples contratos, utilizando así las ventajas de llamadas entre contratos, y mejorar el rendimiento. 
- DApps con lógica compleja pueden ser reorganizados en contratos más simples y pequeños, simplificando el mantenimiento e incrementando las oportunidades de reutilización de contratos.
- DApps con transacciones de larga duración, que son imposibles o impracticas de acomodar en un solo bloque, pueden reorganizarse en múltiples llamadas entre contratos. 
- DApps cuyo diseño se beneficia de realizar múltiples llamadas en paralelo, pueden usar llamadas entre contratos para consolidar los resultados.

Sea por tener una ventaja al usar contratos existentes en la red, o creando por su cuenta un sistema de contratos interdependientes, el poder realizar llamadas entre contratos es una funcionalidad invaluable del protocolo NEAR y un diferenciador único de esta red de capa 1. 

## Llamadas a Funciones

El patrón mas común para realizar llamadas entre contratos, es llamando una función en un contrato desde otro contrato. Esta capacidad se logra mediante una interfaz dedicada para realizar este tipo de llamadas. 

Esta interfaz está implementada en dos niveles de abstracción: 
- Una interfaz ergonómica de alto nivel que provee soporte para tipos de AssemblyScript y Rust.
- Una interfaz estilo C de bajo nivel, que mapea al API de la máquina vritual de NEAR.

### Interfaz de Alto Nivel

La interfaz de alto nivel está diseñada para parecerse a la interfaz de Promise de JavaScript, y sirve de intermediaria a la interfaz de bajo nivel, utilizando tipos de AssemblyScript y Rust como parámetros. 

- `ContractPromise.create`: (método estático) utilizado para el patrón de uso más común, llamar un método de un contrato desde otro.
- `ContractPromise.all`: (método estático) permite consolidar los resultados de múltiples llamadas a métodos. 
- `ContractPromise.then`: permite encadenar múltiples llamadas a métodos (es decir, ejecutar uno luego que el anterior en la cadena termine su ejecución).

**cuándo usar esta interfaz?**

Esta interfaz está recomendada para todas las llamadas entre contratos que invocan a un contrato desde un método en otro contrato. Este escenario es el 80% de los casos. 

El valor de retorno de la llamada al método no será implicitamente capturado ni estará disponible. 

Para capturar el valor de retorno de la llamada, el desarrollador debe explicitamente escoger una de las siguientes opciones:
- obtenerlo luego de finalizar la llamada a la función ejecutada. 
- utilizar un callback a otra función. 

**cómo usar esta interfaz?**
Esta interfaz puede ser usada en cuatro patrones que pueden ser recombinados para crear escenarios mas complejos: 
1. Ignorar por completo el valor de retorno.
2. Reemplazar el valor de retorno de la función ejecutada con el nuevo valor de retorno del método remoto. 
3. Obtener el valor de retorno del método remoto utilizando un callback. 
4. Consolidar el valor de retorno de múltiples llamadas a métodos remotos. 

1. "Dispara y Olvida" (_el valor de retorno del método remoto será ignorado_)

```ts
export function fire_and_forget(): void {
  const promise = ContractPromise.create(
    remote_account,                            // nombre de cuenta remoto
    remote_method,                             // nombre de método remoto
    remote_args,                               // argumentos de método remoto
    BASIC_GAS,                                 // gas asociado a la llamada (~5 Tgas (5e12) por "salto")
    u128.Zero                                  // deposito asociado a la llamada
  )
}
```

2. "Captura la bandera" (_el valor de retorno del médoto remoto se **convierte** en el valor de retorno del método actual_)

```ts
export function capture_the_flag(): void {
    remote_account,                            // nombre de cuenta remoto
    remote_method,                             // nombre de método remoto
    remote_args,                               // argumentos de método remoto
    BASIC_GAS,                                 // gas asociado a la llamada (~5 Tgas (5e12) por "salto")
    u128.Zero                                  // deposito asociado a la llamada
  )
}
  // reemplazar el valor de retorno de este método con el resultado de la Promise
  promise.returnAsResult()
}
```

3. "Tal vez llamame" (_el valor de retorno del método remoto será enviado, por un callback, a otro método_)

```ts
export function call_me_maybe(): void {
  const callback_account = context.contractName
  const callback_method = 'on_complete'
  const callback_args = 'done and done'

  ContractPromise.create(
    remote_account,                            // nombre de cuenta remoto 
    remote_method,                             // nombre de método remoto
    remote_args,                               // argumentos de método remoto
    BASIC_GAS,                                 // gas asociado a la llamada (~5 Tgas (5e12) por "salto")
    u128.Zero                                  // deposito asociado a la llamada
  )

  // asociar callback
  .then(
    callback_account,                          // nombre de cuenta para callback
    callback_method,                           // nombre de método callback
    callback_args,                             // argumentos de método callback
    BASIC_GAS,                                 // gas asociado al callbach (~5 Tgas (5e12) por "salto")
    u128.Zero                                  // deposito asociado al callback
  )
}

// el método callback en si
export function on_complete(args: string): void {
  logging.log(args)
}
```

4. "Todos juntos" (_el valor de retorno de cada método remoto será consolidado en una tupla_)

```ts
export function all_together_now(): void {
  const promise_1 = ContractPromise.create(
    remote_account_1,                          // nombre de cuenta remoto
    remote_method_1,                           // nombre de método remoto
    remote_args_1,                             // argumentos de método remoto
    BASIC_GAS,                                 // gas asociado a la llamda (~5 Tgas (5e12) por "salto")
    u128.Zero                                  // deposito asociado a llamada
  )

  const promise_2 = ContractPromise.create(
    remote_account_2,                          // nombre de cuenta remoto
    remote_method_2,                           // nombre de método remoto
    remote_args_2,                             // argumentos de método remoto
    BASIC_GAS,                                 // ggas asociado a la llamda (~5 Tgas (5e12) por "salto")
    u128.Zero                                  // deposito asociado a llamada
  )

  // consolidar las múltiples llamadas 
  const promise_3 = ContractPromise.all(promise_1, promise_2)

  // reemplazar el valor de retorno de este metodo con el valor de retorno de la consolidación de Promises
  promise_3.returnAsResult()
}
```

### Interfaz de Bajo Nivel

Esta interfaz de bajo nivel al estilo C se comunica directamente con la máquina virtual de NEAR y tiene soporte de las siguientes operaciones: 

- `promise_create`: usado en el patrón mas común, llamando un método de un contrato desde otro.
- `promise_and`: permite consolidar los resultados de múltiples llamadas a métodos.
- `promise_then`: permite encadenar múltiples llamadas a métodos (es decir, ejecutar una llamada luego que la anterior en la cadena termine de ejecutar).

**cuándo usar esta interfaz?**

El uso de esta interfaz no esta recomendada para los desarrolladores. En su lugar, por favor use la interfaz de alto nivel explicada anteriormente. 

**cómo usar esta interfaz?**

Esta interfaz requiere que todas las entradas sean convertidas a `UInt8Arrays`, y su longitud y puntero `datastart` sea provisto a la función. El valor de retorno de esta interfaz es un valor entero, que identifica de manera única el recibo `ActionReceipt` generado por el método utilizado por el Runtime de NEAR Protocol para coordinar el flujo de llamadas entre contratos y las cuentas afectadas en el tiempo (es decir, bloques).

```ts
export function promise_create(
    account_id_len: u64,
    account_id_ptr: u64,
    method_name_len: u64,
    method_name_ptr: u64,
    arguments_len: u64,
    arguments_ptr: u64,
    amount_ptr: u64,
    gas: u64
  ): u64;
```

```ts
export function promise_then(
    promise_index: u64,
    account_id_len: u64,
    account_id_ptr: u64,
    method_name_len: u64,
    method_name_ptr: u64,
    arguments_len: u64,
    arguments_ptr: u64,
    amount_ptr: u64,
    gas: u64
  ): u64;
```

```ts
  export declare function promise_and(
    promise_idx_ptr: u64,
    promise_idx_count: u64
  ): u64;
```

## Llamadas por Lote

Otra forma de realizar llamadas entre contratos es creando una transacción utilizando una o mas acciones primitivas, para luego enviarla a la red desde un contrato. Esta funcionalidad la provee una interfaz dedicada para invocar estas llamadas. 

Esta interfaz está implementada en dos niveles de abstracción: 
- Una interfaz ergonómica de alto nivel que provee soporte para tipos de AssemblyScript y Rust.
- Una interfaz estilo C de bajo nivel, que mapea al API de la máquina vritual de NEAR.

### Ocho (8) Acciones

El protocolo NEAR provee ocho (8) acciones primitivas que pueden utilizarse para producir una sola transacción. Este diseño provee un mecanismo flexible para controlar el comportamiento de la red por parte de los desarrolladores.

Utilizando llamadas por lote entre contratos, los desarrolladores añaden cualquiera de las siguientes ocho acciones NEAR a un lote de transacciones, el cual es entonces procesado por la red: 

- Administrar Cuentas
  - `CreateAccount`: crear una nueva cuenta (para una persona, contrato, nevera, etc.).
  - `DeleteAccount`: eliminar una cuenta (y transferir el balance a una cuenta beneficiaria).
- Administrar Llaves de Acceso (Access Keys)
  - `AddKey`: añadr una llave a una cuenta (con acceso FullAccess o con acceso FunctionCall).
  - `DeleteKey`: eliminar una llave existente de una cuenta.
- Administrar Dinero
  - `Transfer`: mover tokens de una cuenta a otra.
  - `Stake`: expresar interés en asumir el rol de validador en la próxima oportunidad disponible.
- Administrar Contratos: 
  - `DeployContract`: desplegar el contrato. 
  - `FunctionCall`: invocar un método de un contrato (incluyendo presupuesto de cómputo y almacenamiento).

### Interfaz de Alto Nivel

La interfaz de alto nivel usa una cadena de ejecución donde las transacciones son construidas encadenando llamadas que agregan acciones diferentes. 
  
- `ContractPromiseBatch.create`: (método estático) crea un Promise con una cuenta específica como destino, que es la cuenta en la cual la transacción sera efectuada. 
- `ContractPromiseBatch.create_account`: crea la cuenta destino.
- `ContractPromiseBatch.delete_account`: elimina la cuenta destino. 
- `ContractPromiseBatch.add_access_key`: añadir una llave de acceso para llamada (Function Call access key) a la cuenta destino. 
- `ContractPromiseBatch.add_full_access_key`: añadir una llave de acceso completo (Full Access key) a la cuenta destino. 
- `ContractPromiseBatch.delete_key`: eliminar una llave de la cuenta destino.
- `ContractPromiseBatch.transfer`: transferir tokens NEAR desde la cuenta actual a la cuenta destino. 
- `ContractPromiseBatch.stake`: realiza una operación stake en la cuenta destino.
- `ContractPromiseBatch.deploy_contract`: despliega un contrato (arreglo de bytes) a la cuenta destino. 
- `ContractPromiseBatch.function_call`: invocar un método en el contrato contenido en la cuenta destino. 
- `ContractPromiseBatch.then`: encadena otra transacción con una nueva cuenta destino (aunque puede ser la misma).

**cuándo usar esta interfaz?**

Esta interfaz es recomendada para todas las llamadas entre contratos que deban crear transacciones compuestas de acciones mas allá de `FunctionCall` (aunque esta acción específica _también_ es soportada por esta interfaz). Este mecanismo anorda el 20% de los casos de uso que uno pueda imaginarse, a la fecha de escritura de esta guía.

El valor de retorno de la llamada al método no será implicitamente capturado ni estará disponible. 

Para capturar el valor de retorno de la llamada, el desarrollador debe explicitamente escoger una de las siguientes opciones:
- obtenerlo luego de finalizar la llamada a la función ejecutada. 
- utilizar un callback a otra función. 

Estas opciones para obtener un valor de retorno no son mutuamente exclusivas. Los desarrolladores pueden no usar ninguna, una, o ambas, al realizar llamadas entre contratos, dependiendo de los requerimientos. 

**cuándo usar esta interfaz?**



